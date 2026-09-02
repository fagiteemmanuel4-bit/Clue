import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/db'
import { conversations, generatedFiles, voiceSettings } from '@/db/schema'
import { requireUser } from '@/lib/auth'
import { sql } from 'drizzle-orm'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const requestSchema = z.object({
  text: z.string().trim().min(1).max(40_000),
  conversationId: z.string().uuid(),
  accent: z.string().trim().max(80).optional(),
  speed: z.number().min(0.7).max(1.2).optional(),
  pitch: z.number().min(-2).max(2).optional(),
})

const VOICES: Record<string, { id: string; label: string }> = {
  american: { id: process.env.CLUE_ELEVEN_VOICE_AMERICAN || '21m00Tcm4TlvDq8ikWAM', label: 'American · Rachel' },
  british: { id: process.env.CLUE_ELEVEN_VOICE_BRITISH || 'JBFqnCBsd6RMkjVDRZzb', label: 'British · George' },
}

function voiceFor(accent: string | undefined) {
  const key = (accent || 'american').toLowerCase().replace(/[^a-z]/g, '')
  if (key.includes('british') || key.includes('uk')) return VOICES.british
  return VOICES.american
}

export async function POST(request: Request) {
  try {
    const user = await requireUser()
    const parsed = requestSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return Response.json({ error: 'Invalid voice request.' }, { status: 400 })
    const apiKey = process.env.ELEVENLABS_API_KEY?.trim()
    if (!apiKey) return Response.json({ error: 'ElevenLabs is not configured. Add ELEVENLABS_API_KEY to the Vercel environment.' }, { status: 503 })

    const [conversation] = await db.select({ id: conversations.id }).from(conversations).where(and(eq(conversations.id, parsed.data.conversationId), eq(conversations.userId, user.id))).limit(1)
    if (!conversation) return Response.json({ error: 'Conversation not found.' }, { status: 404 })

    const [storedSettings] = await db.select().from(voiceSettings).where(eq(voiceSettings.userId, user.id)).limit(1)
    const accent = parsed.data.accent || storedSettings?.accent || user.preferredAccent || 'american'
    const speed = parsed.data.speed ?? storedSettings?.speed ?? 1
    const pitch = parsed.data.pitch ?? storedSettings?.pitch ?? 0
    const voice = voiceFor(accent)

    const upstream = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice.id}/stream?output_format=mp3_44100_128`, {
      method: 'POST',
      signal: request.signal,
      headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
      body: JSON.stringify({ text: parsed.data.text, model_id: process.env.ELEVENLABS_MODEL_ID || 'eleven_flash_v2_5', voice_settings: { stability: Number(process.env.ELEVENLABS_STABILITY || 0.5), similarity_boost: Number(process.env.ELEVENLABS_SIMILARITY || 0.75), style: Number(process.env.ELEVENLABS_STYLE || 0), use_speaker_boost: true, speed } }),
    })
    if (!upstream.ok) { const detail = await upstream.text().catch(() => ''); return Response.json({ error: `ElevenLabs request failed (${upstream.status})${detail ? `: ${detail.slice(0, 500)}` : ''}` }, { status: 502 }) }
    const bytes = new Uint8Array(await upstream.arrayBuffer())
    if (!bytes.byteLength) return Response.json({ error: 'ElevenLabs returned empty audio.' }, { status: 502 })

    const name = `clue-voice-${Date.now()}.mp3`
    const [file] = await db.insert(generatedFiles).values({
      userId: user.id,
      conversationId: conversation.id,
      name,
      mimeType: 'audio/mpeg',
      size: bytes.byteLength,
      data: sql`decode(${Buffer.from(bytes).toString('base64')}, 'base64')`,
      contentText: parsed.data.text,
      metadata: { kind: 'voice-note', accent, voiceId: voice.id, voiceLabel: voice.label, speed, pitch, modelId: process.env.ELEVENLABS_MODEL_ID || 'eleven_flash_v2_5' },
    }).returning({ id: generatedFiles.id })

    return Response.json({ fileId: file.id, url: `/api/files/${file.id}?inline=1`, mimeType: 'audio/mpeg', accent, voice: voice.label, speed, pitch })
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') return new Response(null, { status: 499 })
    return Response.json({ error: error instanceof Error && error.message === 'UNAUTHORIZED' ? 'Unauthorized' : 'Voice generation failed.' }, { status: error instanceof Error && error.message === 'UNAUTHORIZED' ? 401 : 500 })
  }
}
