export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string }
export type AIProvider = { id: string; label: string; stream: (messages: ChatMessage[], signal?: AbortSignal) => Promise<ReadableStream<Uint8Array>> }

const encoder = new TextEncoder()
const configured = (...names: string[]) => { for (const name of names) { const value = process.env[name]?.trim(); if (value) return value } return '' }

function openAICompatible(id: string, label: string, baseUrl: string, apiKey: string, model: string): AIProvider {
  return { id, label, async stream(messages, signal) {
    const timeout = AbortSignal.timeout(45_000)
    const combined = signal ? AbortSignal.any([signal, timeout]) : timeout
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST', signal: combined,
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream', Authorization: `Bearer ${apiKey}`,
        ...(baseUrl.includes('openrouter.ai') ? { 'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://clue-rouge.vercel.app', 'X-Title': 'Clue' } : {}) },
      body: JSON.stringify({
        model, messages, temperature: 0.6, max_tokens: 1400, stream: true,
        ...(baseUrl.includes('openrouter.ai') ? { provider: { sort: 'latency', allow_fallbacks: true }, models: [model, 'google/gemma-4-31b-it:free'] } : {}),
      }),
    })
    if (!response.ok || !response.body) { const detail = await response.text().catch(() => ''); console.error(`${label} provider error`, response.status, detail); throw new Error(`${label} provider request failed (${response.status})`) }
    const reader = response.body.getReader(), decoder = new TextDecoder(); let buffer = '', finished = false
    return new ReadableStream<Uint8Array>({
      async pull(controller) { if (finished) { controller.close(); return } try { const {done,value}=await reader.read(); if(done){ if(buffer.trim()) processSseBuffer(buffer,controller); finished=true; controller.close(); return } buffer += decoder.decode(value,{stream:true}); const lines=buffer.split(/\r?\n/); buffer=lines.pop()||''; for(const line of lines) processSseLine(line,controller) } catch(error){ finished=true; controller.error(error) } },
      cancel(){ finished=true; reader.cancel().catch(()=>undefined) },
    })
  }}
}
function processSseBuffer(buffer:string,controller:ReadableStreamDefaultController<Uint8Array>){for(const line of buffer.split(/\r?\n/))processSseLine(line,controller)}
function processSseLine(line:string,controller:ReadableStreamDefaultController<Uint8Array>){if(!line.startsWith('data:'))return;const payload=line.slice(5).trim();if(!payload||payload==='[DONE]')return;try{const json=JSON.parse(payload);const content=json.choices?.[0]?.delta?.content;if(typeof content==='string'&&content)controller.enqueue(encoder.encode(content))}catch{}}
export function getProvider(requested?:string):AIProvider|null{const premiumKey=configured('PREMIUM_AI_API_KEY'),freeKey=configured('OPENROUTER_API_KEY','AI_API_KEY'),fallbackKey=configured('FALLBACK_AI_API_KEY');if(requested==='premium'&&premiumKey)return openAICompatible('premium','Premium model',configured('PREMIUM_AI_BASE_URL')||'https://api.openai.com/v1',premiumKey,configured('PREMIUM_AI_MODEL')||'gpt-4o-mini');if(freeKey)return openAICompatible('free','Free model',configured('AI_BASE_URL')||'https://openrouter.ai/api/v1',freeKey,configured('AI_MODEL')||'openrouter/free');if(fallbackKey)return openAICompatible('fallback','Fallback model',configured('FALLBACK_AI_BASE_URL')||'https://api.openai.com/v1',fallbackKey,configured('FALLBACK_AI_MODEL')||'gpt-4o-mini');return null}
