export type ClueIntent = 'chat' | 'web_search' | 'deep_research' | 'file' | 'code' | 'image'

export type IntentDecision = {
  intent: ClueIntent
  confidence: number
  reasons: string[]
}

const patterns: Array<{intent: ClueIntent; weight: number; patterns: RegExp[]}> = [
  { intent: 'deep_research', weight: 0.45, patterns: [/deep research/i, /research (?:this|the|on)/i, /literature review/i, /comprehensive report/i, /compare .* across multiple sources/i, /investigate .* thoroughly/i] },
  { intent: 'web_search', weight: 0.28, patterns: [/\b(search|look up|browse|web|internet|online|latest|today|yesterday|current|recent|news|price|prices|weather)\b/i, /what happened/i, /who is .* (?:today|now)/i, /according to .* (?:source|sources)/i] },
  { intent: 'file', weight: 0.42, patterns: [/\b(make|create|generate|export|turn .* into|convert)\b.*\b(pdf|docx|word|xlsx|excel|spreadsheet|pptx|powerpoint|presentation|zip)\b/i, /downloadable (?:file|document|spreadsheet|presentation)/i] },
  { intent: 'code', weight: 0.30, patterns: [/\b(debug|debugging|implement|refactor|compile|typescript|javascript|python|sql|react|next\.js|code)\b/i, /write .*\b(function|script|component|api)\b/i] },
  { intent: 'image', weight: 0.55, patterns: [/\b(generate|create|draw|edit|retouch|restore|upscale)\b.*\b(image|photo|picture|portrait|illustration|logo)\b/i] },
]

export function classifyIntent(input: string): IntentDecision {
  const text = input.trim()
  if (!text) return { intent: 'chat', confidence: 1, reasons: ['empty'] }
  const scores = new Map<ClueIntent, {score:number; reasons:string[]}>()
  for (const group of patterns) {
    for (const pattern of group.patterns) {
      if (!pattern.test(text)) continue
      const current = scores.get(group.intent) || { score: 0, reasons: [] }
      current.score += group.weight
      current.reasons.push(pattern.source)
      scores.set(group.intent, current)
    }
  }
  const ranked = [...scores.entries()].sort((a,b)=>b[1].score-a[1].score)
  const [best, second] = ranked
  if (!best) return { intent: 'chat', confidence: 0.95, reasons: ['no capability signal'] }
  const bounded = Math.min(0.99, Math.max(0.51, best[1].score - (second?.[1].score || 0) * 0.35))
  return { intent: best[0], confidence: bounded, reasons: best[1].reasons.slice(0,4) }
}

export function shouldUseWeb(input: string) {
  const decision = classifyIntent(input)
  return decision.intent === 'web_search' || decision.intent === 'deep_research'
}
