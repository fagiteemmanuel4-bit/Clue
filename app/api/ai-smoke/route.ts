import { getProvider, type ChatMessage } from '@/lib/clue/providers'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export async function GET(request: Request) {
  const provider = getProvider()
  if (!provider) return Response.json({ ok:false, error:'provider-not-configured' }, { status:503 })
  const q = new URL(request.url).searchParams.get('q') || 'Reply with exactly CLUE_OK.'
  const started = Date.now()
  try {
    const stream = await provider.stream([{ role:'system', content:'You are a smoke-test endpoint. Follow the user request exactly and keep the response under 20 words.' } as ChatMessage, { role:'user', content:q }], request.signal)
    const reader = stream.getReader(); const decoder = new TextDecoder(); let text=''
    while(text.length < 500){ const {done,value}=await reader.read(); if(done)break; text += decoder.decode(value,{stream:true}); if(text.trim()) break }
    await reader.cancel().catch(()=>undefined)
    return Response.json({ ok: !!text.trim(), provider: provider.id, latencyMs: Date.now()-started, response: text.trim() }, { status:text.trim()?200:502 })
  } catch(error) { return Response.json({ ok:false, provider:provider.id, latencyMs:Date.now()-started, error:error instanceof Error?error.message:'AI request failed' }, {status:502}) }
}
