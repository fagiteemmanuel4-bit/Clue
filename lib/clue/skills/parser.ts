import type { SkillCard, SkillToolBinding } from './types'

function clean(value: string) {
  return value.replace(/\r/g, '').trim()
}

function listFromSection(body: string, names: string[]) {
  const lines = body.split('\n')
  const wanted = names.map(n => n.toLowerCase())
  const out: string[] = []
  let active = false
  for (const line of lines) {
    const heading = line.match(/^#{1,3}\s+(.+)$/)?.[1]?.trim().toLowerCase()
    if (heading) {
      active = wanted.some(name => heading === name || heading.includes(name))
      continue
    }
    if (!active) continue
    const item = line.match(/^\s*(?:[-*+] |\d+[.)] )(.+)$/)?.[1]
    if (item) out.push(clean(item))
  }
  return out
}

function parseFrontmatter(text: string) {
  const match = text.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/)
  if (!match) return { meta: {} as Record<string, string>, body: text }
  const meta: Record<string, string> = {}
  for (const line of match[1].split('\n')) {
    const colon = line.indexOf(':')
    if (colon < 1) continue
    const key = line.slice(0, colon).trim()
    const value = line.slice(colon + 1).trim().replace(/^['"]|['"]$/g, '')
    meta[key] = value
  }
  return { meta, body: match[2] }
}

function inferKeywords(name: string, description: string, body: string) {
  const stop = new Set(['about','after','again','also','from','into','only','that','this','then','than','their','there','these','they','when','where','which','with','your','use','using','user','must','should','will','have','has','for','and','the'])
  return [...new Set(`${name} ${description} ${body}`.toLowerCase().match(/[a-z][a-z0-9-]{2,}/g) || [])]
    .filter(word => !stop.has(word)).slice(0, 80)
}

function inferTools(text: string) {
  const known = ['files','web','browser','code','api','mcp','database','search','github','vercel','neon']
  return known.filter(tool => new RegExp(`\\b${tool}\\b`, 'i').test(text))
}

export function parseSkillText(text: string, source: SkillCard['source'], fallbackId = 'skill') : SkillCard {
  const raw = clean(text)
  if (!raw) throw new Error('Skill is empty.')
  let parsed: Record<string, unknown> | null = null
  if (raw.startsWith('{')) {
    try { parsed = JSON.parse(raw) as Record<string, unknown> } catch { parsed = null }
  }
  if (parsed) {
    const id = String(parsed.id || parsed.name || fallbackId).toLowerCase().replace(/[^a-z0-9-]+/g, '-')
    const description = String(parsed.description || '')
    const instructions = Array.isArray(parsed.instructions) ? parsed.instructions.map(String) : []
    const steps = Array.isArray(parsed.steps) ? parsed.steps.map(String) : instructions
    const triggers = Array.isArray(parsed.triggers) ? parsed.triggers.map(String) : []
    const keywords = Array.isArray(parsed.keywords) ? parsed.keywords.map(String) : inferKeywords(id, description, raw)
    const toolDependencies = Array.isArray(parsed.toolDependencies) ? parsed.toolDependencies.map(String) : inferTools(raw)
    const toolBindings: SkillToolBinding[] = Array.isArray(parsed.toolBindings) ? parsed.toolBindings.map((x) => typeof x === 'string' ? { id: x } : x as SkillToolBinding) : toolDependencies.map(id => ({ id }))
    return { id, name: String(parsed.name || id), description, triggers, keywords, instructions, steps, toolDependencies, toolBindings, source, content: raw }
  }
  const { meta, body } = parseFrontmatter(raw)
  const title = body.match(/^#\s+(.+)$/m)?.[1]?.trim() || meta.name || fallbackId
  const id = String(meta.name || fallbackId || title).toLowerCase().replace(/[^a-z0-9-]+/g, '-')
  const description = String(meta.description || body.split('\n').find(line => line.trim() && !line.startsWith('#')) || '').trim()
  const triggers = listFromSection(body, ['triggers','when to use','use when','activation'])
  const steps = listFromSection(body, ['workflow','steps','process','core process','how it works'])
  const instructions = listFromSection(body, ['instructions','rules','guidelines','principles'])
  const toolDependencies = [...new Set([...inferTools(raw), ...listFromSection(body, ['tools','tool dependencies','dependencies']).flatMap(item => inferTools(item))])]
  const keywords = inferKeywords(title, description, body)
  const toolBindings = toolDependencies.map(tool => ({ id: tool, requiresApproval: ['code','browser','api','mcp'].includes(tool) }))
  return { id, name: title, description, triggers, keywords, instructions, steps, toolDependencies, toolBindings, source, content: raw }
}
