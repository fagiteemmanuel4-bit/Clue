import { NextResponse } from 'next/server'
import { routeSkills } from '@/lib/clue/skills/router'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const q = url.searchParams.get('q')?.trim() || ''
  if (!q) return NextResponse.json({ skills: [] })
  const matches = await routeSkills(q, 5)
  return NextResponse.json({ skills: matches.map(match => ({ id: match.skill.id, name: match.skill.name, description: match.skill.description, score: match.score, matchedTerms: match.matchedTerms, source: match.skill.source })) }, { headers: { 'Cache-Control': 'no-store' } })
}
