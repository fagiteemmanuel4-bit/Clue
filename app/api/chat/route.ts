import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { messages } = await request.json()
    const apiKey = process.env.AI_API_KEY
    const baseUrl = process.env.AI_BASE_URL || 'https://api.openai.com/v1'
    const model = process.env.AI_MODEL || 'gpt-4o-mini'

    if (!apiKey) {
      return NextResponse.json({
        message: 'Clue is ready, but its AI provider is not connected yet. Add AI_API_KEY and AI_MODEL in Vercel to enable live responses.'
      }, { status: 200 })
    }

    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, messages, temperature: 0.7, stream: false }),
    })

    if (!response.ok) {
      const detail = await response.text()
      console.error('AI provider error:', response.status, detail)
      return NextResponse.json({ message: 'Clue could not reach its AI provider. Please try again.' }, { status: 502 })
    }

    const data = await response.json()
    return NextResponse.json({ message: data.choices?.[0]?.message?.content || 'I could not generate a response.' })
  } catch (error) {
    console.error('Chat route error:', error)
    return NextResponse.json({ message: 'Something went wrong while processing that message.' }, { status: 500 })
  }
}
