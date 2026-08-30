export type ClueTool = {
  id: string
  name: string
  description: string
  kind: 'builtin' | 'plugin' | 'mcp' | 'api'
  requiresApproval?: boolean
}

export const defaultTools: ClueTool[] = [
  { id: 'web', name: 'Web', description: 'Search and read the web', kind: 'builtin' },
  { id: 'code', name: 'Code', description: 'Run code in a sandbox', kind: 'builtin', requiresApproval: true },
  { id: 'files', name: 'Files', description: 'Read and transform workspace files', kind: 'builtin' },
  { id: 'browser', name: 'Browser', description: 'Navigate and interact with websites', kind: 'builtin', requiresApproval: true },
  { id: 'api', name: 'API', description: 'Call connected APIs using scoped credentials', kind: 'api', requiresApproval: true },
  { id: 'mcp', name: 'MCP', description: 'Connect external Model Context Protocol tools', kind: 'mcp', requiresApproval: true },
]

export function registerTool(tool: ClueTool, registry: ClueTool[] = defaultTools) {
  if (registry.some((item) => item.id === tool.id)) return registry
  return [...registry, tool]
}
