import { getProvider } from '@/lib/clue/providers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 15

export async function GET() {
  const started = Date.now()
  const provider = getProvider('free')
  if (!provider) return Response.json({ ok: false, error: 'No AI provider configured.' }, { status: 503 })
  try {
    const stream = await provider.stream([{ role: 'user', content: 'Reply with exactly CLUE_SMOKE_OK and nothing else.' }])
    const reader = stream.getReader()
    const decoder = new TextDecoder()
    let text = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      text += decoder.decode(value, { stream: true })
      if (text.length > 300) break
    }
    await reader.cancel().catch(() => undefined)
    return Response.json({ ok: text.includes('CLUE_SMOKE_OK'), text: text.slice(0, 300), elapsedMs: Date.now() - started })
  } catch (error) {
    return Response.json({ ok: false, error: error instanceof Error ? error.message : 'AI smoke test failed.', elapsedMs: Date.now() - started }, { status: 502 })
  }
}
