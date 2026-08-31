import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getProvider } from '@/lib/clue/providers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const messageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant']),
  content: z.string().min(1).max(100_000),
})

const bodySchema = z.object({
  messages: z.array(messageSchema).min(1).max(100),
  model: z.string().optional(),
})

export async function POST(request: Request) {
  try {
    const parsed = bodySchema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ error: 'Invalid chat request.' }, { status: 400 })

    const provider = getProvider(parsed.data.model)
    if (!provider) return NextResponse.json({ error: 'No AI provider is configured.' }, { status: 503 })

    const stream = await provider.stream(parsed.data.messages, request.signal)
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'X-Accel-Buffering': 'no',
      },
    })
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') return new Response(null, { status: 499 })
    console.error('Chat route error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Something went wrong while processing that message.' }, { status: 500 })
  }
}
