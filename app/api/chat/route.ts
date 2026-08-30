import { NextResponse } from 'next/server'
import { getProvider } from '@/lib/clue/providers'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const messages = Array.isArray(body?.messages) ? body.messages : []
    if (!messages.length) return NextResponse.json({ error: 'Messages are required.' }, { status: 400 })

    const provider = getProvider(body?.model)
    if (!provider) return NextResponse.json({ error: 'No AI provider is configured.' }, { status: 503 })

    const stream = await provider.stream(messages, request.signal)
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
    return NextResponse.json({ error: 'Something went wrong while processing that message.' }, { status: 500 })
  }
}
