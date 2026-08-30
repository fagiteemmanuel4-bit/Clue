export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string }
export type AIProvider = { id: string; label: string; stream: (messages: ChatMessage[], signal?: AbortSignal) => Promise<ReadableStream<Uint8Array>> }

const encoder = new TextEncoder()
const configured = (...names: string[]) => {
  for (const name of names) {
    const value = process.env[name]?.trim()
    if (value) return value
  }
  return ''
}

function openAICompatible(id: string, label: string, baseUrl: string, apiKey: string, model: string): AIProvider {
  return {
    id,
    label,
    async stream(messages, signal) {
      const response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
        method: 'POST',
        signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          ...(baseUrl.includes('openrouter.ai')
            ? {
                'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://clue-rouge.vercel.app',
                'X-Title': 'Clue',
              }
            : {}),
        },
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
          if (done) {
            controller.close()
            return
          }

          const text = decoder.decode(value, { stream: true })
          for (const line of text.split(/\r?\n/)) {
            if (!line.startsWith('data:')) continue
            const payload = line.slice(5).trim()
            if (!payload || payload === '[DONE]') continue

            try {
              const json = JSON.parse(payload)
              const content = json.choices?.[0]?.delta?.content
              if (typeof content === 'string' && content) controller.enqueue(encoder.encode(content))
            } catch {
              // Ignore malformed/partial SSE frames.
            }
          }
        },
        cancel() {
          reader.cancel().catch(() => undefined)
        },
      })
    },
  }
}

export function getProvider(requested?: string): AIProvider | null {
  const premiumKey = configured('PREMIUM_AI_API_KEY')
  const freeKey = configured('OPENROUTER_API_KEY', 'AI_API_KEY')
  const fallbackKey = configured('FALLBACK_AI_API_KEY')

  if (requested === 'premium' && premiumKey) {
    return openAICompatible(
      'premium',
      'Premium model',
      configured('PREMIUM_AI_BASE_URL') || 'https://api.openai.com/v1',
      premiumKey,
      configured('PREMIUM_AI_MODEL') || 'gpt-4o-mini',
    )
  }

  if (freeKey) {
    return openAICompatible(
      'free',
      'Free model',
      configured('AI_BASE_URL') || 'https://openrouter.ai/api/v1',
      freeKey,
      configured('AI_MODEL') || 'openrouter/free',
    )
  }

  if (fallbackKey) {
    return openAICompatible(
      'fallback',
      'Fallback model',
      configured('FALLBACK_AI_BASE_URL') || 'https://api.openai.com/v1',
      fallbackKey,
      configured('FALLBACK_AI_MODEL') || 'gpt-4o-mini',
    )
  }

  return null
}
