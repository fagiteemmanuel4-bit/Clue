export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string }
export type AIProvider = { id: string; label: string; stream: (messages: ChatMessage[], signal?: AbortSignal) => Promise<ReadableStream<Uint8Array>> }

const encoder = new TextEncoder()
const configured = (...names: string[]) => { for (const name of names) { const value = process.env[name]?.trim(); if (value) return value } return '' }

const FIRST_TOKEN_TIMEOUT = 15_000
const REQUEST_TIMEOUT = 20_000
const STREAM_IDLE_TIMEOUT = 18_000
const NON_STREAM_TIMEOUT = 15_000

function combinedSignal(signal: AbortSignal | undefined, controller: AbortController, timeoutMs: number) {
  const timeout = AbortSignal.timeout(timeoutMs)
  return signal ? AbortSignal.any([signal, controller.signal, timeout]) : AbortSignal.any([controller.signal, timeout])
}

function readWithTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('AI provider did not respond in time.')), ms)
    promise.then(value => { clearTimeout(timer); resolve(value) }, error => { clearTimeout(timer); reject(error) })
  })
}

async function requestStream(baseUrl: string, apiKey: string, model: string, messages: ChatMessage[], signal?: AbortSignal) {
  const controller = new AbortController()
  const combined = combinedSignal(signal, controller, REQUEST_TIMEOUT)
  const isOpenRouter = baseUrl.includes('openrouter.ai')
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST', signal: combined,
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream', Authorization: `Bearer ${apiKey}`, ...(isOpenRouter ? { 'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://clue-rouge.vercel.app', 'X-Title': 'Clue' } : {}) },
    body: JSON.stringify({ model, messages, temperature: 0.4, max_tokens: 700, stream: true, ...(isOpenRouter ? { provider: { sort: 'latency', allow_fallbacks: true } } : {}) }),
  })
  if (!response.ok || !response.body) { const detail = await response.text().catch(() => ''); throw new Error(`AI provider request failed (${response.status})${detail ? `: ${detail.slice(0, 300)}` : ''}`) }
  return { reader: response.body.getReader(), controller }
}

async function requestNonStreaming(baseUrl: string, apiKey: string, model: string, messages: ChatMessage[], signal?: AbortSignal) {
  const controller = new AbortController()
  const combined = combinedSignal(signal, controller, NON_STREAM_TIMEOUT)
  const isOpenRouter = baseUrl.includes('openrouter.ai')
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST', signal: combined,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}`, ...(isOpenRouter ? { 'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://clue-rouge.vercel.app', 'X-Title': 'Clue' } : {}) },
    body: JSON.stringify({ model, messages, temperature: 0.4, max_tokens: 700, stream: false, ...(isOpenRouter ? { provider: { sort: 'latency', allow_fallbacks: true } } : {}) }),
  })
  if (!response.ok) { const detail = await response.text().catch(() => ''); throw new Error(`AI provider request failed (${response.status})${detail ? `: ${detail.slice(0, 300)}` : ''}`) }
  const json = await response.json() as { choices?: Array<{ message?: { content?: string } }> }
  const content = json.choices?.[0]?.message?.content
  if (typeof content !== 'string' || !content.trim()) throw new Error('AI provider returned an empty response.')
  return content
}

function openAICompatible(id: string, label: string, baseUrl: string, apiKey: string, model: string, fallbackModel?: string): AIProvider {
  return {
    id, label,
    async stream(messages, signal) {
      let reader: ReadableStreamDefaultReader<Uint8Array> | null = null
      let requestController: AbortController | null = null
      let firstValue: Uint8Array | null = null

      for (const candidate of [model, fallbackModel].filter(Boolean) as string[]) {
        try {
          const attempt = await requestStream(baseUrl, apiKey, candidate, messages, signal)
          requestController = attempt.controller
          const first = await readWithTimeout(attempt.reader.read(), FIRST_TOKEN_TIMEOUT)
          if (first.done) throw new Error('AI provider closed the stream before sending a response.')
          reader = attempt.reader
          firstValue = first.value || new Uint8Array()
          console.info(`[Clue AI] stream started with ${candidate}`)
          break
        } catch (error) {
          requestController?.abort(); requestController = null; reader = null; firstValue = null
          if (signal?.aborted) throw error
          console.warn(`[Clue AI] ${candidate} failed to start; trying fallback.`)
        }
      }

      if (!reader || firstValue === null) {
        if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
        const fallback = fallbackModel || model
        const content = await requestNonStreaming(baseUrl, apiKey, fallback, messages, signal)
        return new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(encoder.encode(content)); controller.close() } })
      }

      const streamReader = reader
      const controllerForRequest = requestController
      let buffer = ''
      let finished = false
      const decoder = new TextDecoder()
      return new ReadableStream<Uint8Array>({
        start(controller) {
          buffer += decoder.decode(firstValue!, { stream: true })
          const lines = buffer.split(/\r?\n/); buffer = lines.pop() || ''
          for (const line of lines) processSseLine(line, controller)
        },
        async pull(controller) {
          if (finished) { controller.close(); return }
          try {
            const { done, value } = await readWithTimeout(streamReader.read(), STREAM_IDLE_TIMEOUT)
            if (done) {
              if (buffer.trim()) processSseBuffer(buffer, controller)
              finished = true; controller.close(); controllerForRequest?.abort(); return
            }
            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split(/\r?\n/); buffer = lines.pop() || ''
            for (const line of lines) processSseLine(line, controller)
          } catch (error) {
            finished = true; controllerForRequest?.abort(); controller.error(error)
          }
        },
        cancel() { finished = true; controllerForRequest?.abort(); streamReader.cancel().catch(() => undefined) },
      })
    },
  }
}

function processSseBuffer(buffer: string, controller: ReadableStreamDefaultController<Uint8Array>) { for (const line of buffer.split(/\r?\n/)) processSseLine(line, controller) }
function processSseLine(line: string, controller: ReadableStreamDefaultController<Uint8Array>) {
  if (!line.startsWith('data:')) return
  const payload = line.slice(5).trim()
  if (!payload || payload === '[DONE]') return
  try { const json = JSON.parse(payload); const content = json.choices?.[0]?.delta?.content; if (typeof content === 'string' && content) controller.enqueue(encoder.encode(content)) } catch { /* Ignore incomplete/keep-alive SSE frames. */ }
}

export function getProvider(requested?: string): AIProvider | null {
  const premiumKey = configured('PREMIUM_AI_API_KEY')
  const freeKey = configured('OPENROUTER_API_KEY', 'AI_API_KEY')
  const fallbackKey = configured('FALLBACK_AI_API_KEY')
  if (requested === 'premium' && premiumKey) return openAICompatible('premium', 'Premium model', configured('PREMIUM_AI_BASE_URL') || 'https://api.openai.com/v1', premiumKey, configured('PREMIUM_AI_MODEL') || 'gpt-4o-mini')
  if (freeKey) return openAICompatible('free', 'Free model', configured('AI_BASE_URL') || 'https://openrouter.ai/api/v1', freeKey, configured('AI_MODEL') || 'openrouter/free', configured('AI_FALLBACK_MODEL') || 'openai/gpt-oss-20b:free')
  if (fallbackKey) return openAICompatible('fallback', 'Fallback model', configured('FALLBACK_AI_BASE_URL') || 'https://api.openai.com/v1', fallbackKey, configured('FALLBACK_AI_MODEL') || 'gpt-4o-mini')
  return null
}
