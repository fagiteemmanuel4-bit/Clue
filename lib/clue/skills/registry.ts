import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { parseSkillText } from './parser'
import type { SkillCard } from './types'

let cache: SkillCard[] | null = null

async function walk(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => [])
  const files: string[] = []
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) files.push(...await walk(full))
    else if (/\.(skill|md|json)$/i.test(entry.name)) files.push(full)
  }
  return files
}

export async function loadSkillCards(force = false): Promise<SkillCard[]> {
  if (cache && !force) return cache
  const root = path.join(process.cwd(), 'skills')
  const files = await walk(root)
  const cards: SkillCard[] = []
  for (const file of files) {
    try {
      const text = await readFile(file, 'utf8')
      if (path.basename(file).toLowerCase() === 'sources.json') continue
      const relative = path.relative(process.cwd(), file)
      const source = { kind: relative.includes('/external/') ? 'github' as const : 'builtin' as const, path: relative }
      cards.push(parseSkillText(text, source, path.basename(file, path.extname(file))))
    } catch (error) {
      console.warn(`[Clue Skills] skipped ${file}:`, error instanceof Error ? error.message : error)
    }
  }
  const deduped = new Map<string, SkillCard>()
  for (const card of cards) deduped.set(card.id, card)
  cache = [...deduped.values()]
  return cache
}

export async function getSkill(id: string) {
  const skills = await loadSkillCards()
  return skills.find(skill => skill.id === id)
}
