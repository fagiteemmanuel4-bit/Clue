export type SkillSource = {
  kind: 'builtin' | 'github' | 'registry' | 'user'
  repository?: string
  url?: string
  path?: string
  license?: string
}

export type SkillToolBinding = {
  id: string
  purpose?: string
  requiresApproval?: boolean
}

export type SkillCard = {
  id: string
  name: string
  description: string
  triggers: string[]
  keywords: string[]
  instructions: string[]
  steps: string[]
  toolDependencies: string[]
  toolBindings: SkillToolBinding[]
  source: SkillSource
  content: string
}

export type RoutedSkill = {
  skill: SkillCard
  score: number
  matchedTerms: string[]
}
