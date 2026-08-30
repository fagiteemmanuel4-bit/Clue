export type ChatMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export type AIProvider = {
  id: string
  label: string
  stream: (messages: ChatMessage[], signal?: AbortSignal) => Promise<ReadableStream<Uint8Array>>
}

const encoder = new TextEncoder()

function configured(name: string) {
  return process.env[name]?.trim() || ''
}

function openAICompatible(id: string, label: string, baseUrl: string, apiKey: string, model: string): AIProvider {
  return {
    id,
    label,
    async stream(messages, signal) {
      const response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
        method: 'POST',
        signal,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model, messages, temperature: 0.7, stream: true }),
      })
      if (!response.ok || !response.body) {
        const detail = await response.text().catch(() => '')
        console.error(`${label} provider error`, response.status, detail)
        throw new Error(`${label} provider request failed`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      return new ReadableStream<Uint8Array>({
        async pull(controller) {
          const { done, value } = await reader.read()
          if (done) { controller.close(); return }
          const text = decoder.decode(value, { stream: true })
          for (const line of text.split(/\r?\n/)) {
            if (!line.startsWith('data:')) continue
            const payload = line.slice(5).trim()
            if (!payload || payload === '[DONE]') continue
            try {
              const json = JSON.parse(payload)
              const content = json.choices?.[0]?.delta?.content
              if (typeof content === 'string' && content) controller.enqueue(encoder.encode(content))
            } catch { /* Ignore partial/non-JSON SSE lines. */ }
          }
        },
        cancel() { reader.cancel().catch(() => undefined) },
      })
    },
  }
}

export function getProvider(requested?: string): AIProvider | null {
  const key = configured('AI_API_KEY')
  if (!key) return null
  const id = requested === 'premium' && configured('PREMIUM_AI_API_KEY') ? 'premium' : 'free'
  const premium = id === 'premium'
  return openAICompatible(
    id,
    premium ? 'Premium model' : 'Free model',
    premium ? (configured('PREMIUM_AI_BASE_URL') || 'https://api.openai.com/v1') : (configured('AI_BASE_URL') || 'https://api.openai.com/v1'),
    premium ? configured('PREMIUM_AI_API_KEY') : key,
    premium ? (configured('PREMIUM_AI_MODEL') || configured('AI_MODEL') || 'gpt-4o-mini') : (configured('AI_MODEL') || 'gpt-4o-mini'),
  )
}
