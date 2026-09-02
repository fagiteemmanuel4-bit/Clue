export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string }
export type AIProvider = { id: string; label: string; stream: (messages: ChatMessage[], signal?: AbortSignal) => Promise<ReadableStream<Uint8Array>>; complete: (messages: ChatMessage[], signal?: AbortSignal) => Promise<string> }

const encoder = new TextEncoder()
const configured = (...names: string[]) => { for (const name of names) { const value = process.env[name]?.trim(); if (value) return value } return '' }
const REQUEST_TIMEOUT = 60_000

function combinedSignal(signal: AbortSignal | undefined, controller: AbortController, timeoutMs: number) {
  const timeout = AbortSignal.timeout(timeoutMs)
  return signal ? AbortSignal.any([signal, controller.signal, timeout]) : AbortSignal.any([controller.signal, timeout])
}

function openRouterHeaders(apiKey: string, baseUrl: string) {
  const isOpenRouter = baseUrl.includes('openrouter.ai')
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}`, ...(isOpenRouter ? { 'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://clue-nmmn.vercel.app', 'X-Title': 'Clue' } : {}) }
}

async function requestNonStreaming(baseUrl: string, apiKey: string, model: string, messages: ChatMessage[], signal?: AbortSignal, maxTokens = 900) {
  const controller = new AbortController()
  const combined = combinedSignal(signal, controller, REQUEST_TIMEOUT)
  const isOpenRouter = baseUrl.includes('openrouter.ai')
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST', signal: combined, headers: openRouterHeaders(apiKey, baseUrl),
    body: JSON.stringify({ model, messages, temperature: 0.4, max_tokens: maxTokens, stream: false, ...(isOpenRouter ? { tools: [{ type: 'openrouter:web_search', parameters: { engine: 'auto', max_results: 5 } }] } : {}) }),
  })
  if (!response.ok) { const detail = await response.text().catch(() => ''); throw new Error(`AI provider request failed (${response.status})${detail ? `: ${detail.slice(0, 500)}` : ''}`) }
  const json = await response.json() as { choices?: Array<{ message?: { content?: string; annotations?: Array<{ type?: string; url_citation?: { url?: string; title?: string } }> } }>; model?: string }
  const choice = json.choices?.[0]?.message
  let content = choice?.content
  if (typeof content !== 'string' || !content.trim()) throw new Error('AI provider returned an empty response.')
  const sources = (choice?.annotations || []).map(a => a.url_citation).filter((x): x is { url: string; title?: string } => Boolean(x?.url)).filter((x, i, all) => all.findIndex(y => y.url === x.url) === i).slice(0, 8)
  if (sources.length) content += `\n\n[[CLUE_SOURCES]]\n${sources.map(s => `- [${s.title || new URL(s.url).hostname}](${s.url})`).join('\n')}\n[[/CLUE_SOURCES]]`
  console.info(`[Clue AI] response received from ${json.model || model}${sources.length ? ` with ${sources.length} web sources` : ''}`)
  return content
}

async function requestStreaming(baseUrl: string, apiKey: string, model: string, messages: ChatMessage[], signal?: AbortSignal, maxTokens = 900) {
  const controller = new AbortController()
  const combined = combinedSignal(signal, controller, REQUEST_TIMEOUT)
  const isOpenRouter = baseUrl.includes('openrouter.ai')
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST', signal: combined, headers: { ...openRouterHeaders(apiKey, baseUrl), Accept: 'text/event-stream' },
    body: JSON.stringify({ model, messages, temperature: 0.4, max_tokens: maxTokens, stream: true, ...(isOpenRouter ? { tools: [{ type: 'openrouter:web_search', parameters: { engine: 'auto', max_results: 5 } }] } : {}) }),
  })
  if (!response.ok) { const detail = await response.text().catch(() => ''); throw new Error(`AI provider request failed (${response.status})${detail ? `: ${detail.slice(0, 500)}` : ''}`) }
  if (!response.body) throw new Error('AI provider returned no streaming body.')

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let sawContent = false
  let finished = false

  const parseEvent = (data: string) => {
    if (!data || data === '[DONE]') { if (data === '[DONE]') finished = true; return '' }
    let json: { choices?: Array<{ delta?: { content?: unknown }; finish_reason?: string | null }>; error?: { message?: string } }
    try { json = JSON.parse(data) } catch { return '' }
    if (json.error) throw new Error(`AI provider stream error: ${json.error.message || 'Unknown provider error.'}`)
    const delta = json.choices?.[0]?.delta?.content
    if (typeof delta === 'string' && delta) { sawContent = true; return delta }
    return ''
  }

  return new ReadableStream<Uint8Array>({
    async start(streamController) {
      try {
        while (!finished) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const events = buffer.split(/\r?\n\r?\n/)
          buffer = events.pop() || ''
          for (const event of events) {
            const data = event.split(/\r?\n/).filter(line => line.startsWith('data:')).map(line => line.slice(5).trimStart()).join('\n')
            const text = parseEvent(data)
            if (text) streamController.enqueue(encoder.encode(text))
            if (finished) break
          }
        }
        buffer += decoder.decode()
        if (buffer.trim()) {
          const data = buffer.split(/\r?\n/).filter(line => line.startsWith('data:')).map(line => line.slice(5).trimStart()).join('\n')
          const text = parseEvent(data)
          if (text) streamController.enqueue(encoder.encode(text))
        }
        if (!sawContent && !combined.aborted) throw new Error('AI provider returned an empty streamed response.')
        streamController.close()
      } catch (error) {
        if (combined.aborted || (error instanceof Error && error.name === 'AbortError')) streamController.error(new DOMException('Generation stopped.', 'AbortError'))
        else streamController.error(error)
      } finally {
        reader.releaseLock()
      }
    },
    cancel() { controller.abort() },
  })
}

function openAICompatible(id: string, label: string, baseUrl: string, apiKey: string, model: string, fallbackModels: string[] = []): AIProvider {
  const candidates = () => [model, ...fallbackModels].filter((item, index, all) => item && all.indexOf(item) === index).slice(0, 3)
  return {
    id, label,
    async stream(messages, signal) {
      let lastError: unknown = null
      for (const candidate of candidates()) {
        try {
          // The provider stream is consumed directly as SSE and transformed into plain text chunks.
          // If the client aborts, the upstream fetch is aborted too; there is no completed response
          // sitting in memory for the UI to fake-stop after the fact.
          return await requestStreaming(baseUrl, apiKey, candidate, messages, signal)
        } catch (error) {
          lastError = error
          if (signal?.aborted) throw error
          console.warn(`[Clue AI] ${candidate} streaming request failed; trying next model.`)
        }
      }
      throw lastError instanceof Error ? lastError : new Error('AI provider did not respond.')
    },
    async complete(messages, signal) {
      let lastError: unknown = null
      for (const candidate of candidates()) {
        try { return await requestNonStreaming(baseUrl, apiKey, candidate, messages, signal, 900) }
        catch (error) { lastError = error; if (signal?.aborted) throw error; console.warn(`[Clue AI] ${candidate} failed for completion; trying next model.`) }
      }
      throw lastError instanceof Error ? lastError : new Error('AI provider did not respond.')
    },
  }
}

export function getProvider(requested?: string): AIProvider | null {
  const premiumKey = configured('PREMIUM_AI_API_KEY'), freeKey = configured('OPENROUTER_API_KEY', 'AI_API_KEY'), fallbackKey = configured('FALLBACK_AI_API_KEY')
  if (requested === 'premium' && premiumKey) return openAICompatible('premium', 'Premium model', configured('PREMIUM_AI_BASE_URL') || 'https://api.openai.com/v1', premiumKey, configured('PREMIUM_AI_MODEL') || 'gpt-4o-mini')
  if (freeKey) return openAICompatible('free', 'Free model', configured('AI_BASE_URL') || 'https://openrouter.ai/api/v1', freeKey, configured('AI_MODEL') || 'openrouter/free', ['openai/gpt-oss-120b:free', 'meta-llama/llama-3.2-3b-instruct:free'])
  if (fallbackKey) return openAICompatible('fallback', 'Fallback model', configured('FALLBACK_AI_BASE_URL') || 'https://api.openai.com/v1', fallbackKey, configured('FALLBACK_AI_MODEL') || 'gpt-4o-mini')
  return null
}
