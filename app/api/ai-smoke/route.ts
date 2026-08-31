import { getProvider } from '@/lib/clue/providers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const provider = getProvider()
  if (!provider) return Response.json({ ok: false, error: 'No AI provider configured' }, { status: 503 })
  const started = Date.now()
  try {
    const stream = await provider.stream([
      { role: 'system', content: 'You are a production smoke-test assistant. Reply with exactly: CLUE_SMOKE_OK' },
      { role: 'user', content: 'Respond now.' },
    ])
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Clue-Smoke-Ms': String(Date.now() - started),
      },
    })
  } catch (error) {
    return Response.json({ ok: false, error: error instanceof Error ? error.message : 'Smoke test failed' }, { status: 502 })
  }
}
