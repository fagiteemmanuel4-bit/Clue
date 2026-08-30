export type ClueTool = {
  id: string
  name: string
  description: string
  kind: 'builtin' | 'plugin' | 'mcp' | 'api'
  requiresApproval?: boolean
  requiresAuth?: boolean
  permissions?: string[]
  inputSchema?: Record<string, unknown>
}

export const defaultTools: ClueTool[] = [
  { id: 'web', name: 'Web', description: 'Search and read the web', kind: 'builtin', permissions: ['network:read'] },
  { id: 'code', name: 'Code', description: 'Run code in a sandbox', kind: 'builtin', requiresApproval: true, permissions: ['sandbox:execute'] },
  { id: 'files', name: 'Files', description: 'Read and transform workspace files', kind: 'builtin', permissions: ['files:read', 'files:write'] },
  { id: 'browser', name: 'Browser', description: 'Navigate and interact with websites', kind: 'builtin', requiresApproval: true, permissions: ['network:read', 'browser:write'] },
  { id: 'api', name: 'API', description: 'Call connected APIs using scoped credentials', kind: 'api', requiresApproval: true, requiresAuth: true, permissions: ['integration:invoke'] },
  { id: 'mcp', name: 'MCP', description: 'Connect external Model Context Protocol tools', kind: 'mcp', requiresApproval: true, requiresAuth: true, permissions: ['integration:invoke'] },
]

export function registerTool(tool: ClueTool, registry: ClueTool[] = defaultTools) {
  if (registry.some((item) => item.id === tool.id)) return registry
  return [...registry, tool]
}

export function getTool(id: string, registry: ClueTool[] = defaultTools) {
  return registry.find((tool) => tool.id === id)
}
