import { loadSkillCards } from './registry'
import type { RoutedSkill, SkillCard } from './types'

const normalize = (text: string) => text.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/).filter(Boolean)

function scoreSkill(skill: SkillCard, input: string): RoutedSkill {
  const tokens = new Set(normalize(input))
  const fields = [skill.name, skill.description, ...skill.triggers, ...skill.keywords]
  const matchedTerms: string[] = []
  let score = 0
  for (const field of fields) {
    for (const term of normalize(field)) {
      if (tokens.has(term)) {
        const weight = skill.triggers.some(t => normalize(t).includes(term)) ? 3 : skill.keywords.includes(term) ? 2 : 1
        score += weight
        if (!matchedTerms.includes(term)) matchedTerms.push(term)
      }
    }
  }
  for (const trigger of skill.triggers) {
    const phrase = normalize(trigger).join(' ')
    if (phrase.length > 8 && input.toLowerCase().includes(phrase)) score += 8
  }
  return { skill, score, matchedTerms: matchedTerms.slice(0, 12) }
}

export async function routeSkills(input: string, limit = 3) {
  const skills = await loadSkillCards()
  return skills.map(skill => scoreSkill(skill, input)).filter(result => result.score > 0).sort((a, b) => b.score - a.score).slice(0, limit)
}

export async function routeSkill(input: string) {
  const [best] = await routeSkills(input, 1)
  return best && best.score >= 2 ? best : null
}
