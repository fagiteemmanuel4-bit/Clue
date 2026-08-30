export const clueFeatures = {
  chat: ['Streaming responses', 'Multi-model routing', 'Reasoning modes', 'Regenerate / edit / branch', 'Conversation search', 'Incognito chats'],
  multimodal: ['Image understanding', 'Document understanding', 'Voice input', 'Voice notes', 'Spoken responses', 'Image generation', 'Video generation', 'Audio generation'],
  workspace: ['Projects', 'Persistent memory', 'Files', 'Collections', 'Canvas', 'Artifacts', 'Export and share'],
  tools: ['Web search', 'Code execution', 'Browser automation', 'API calls', 'Function calling', 'MCP servers', 'Plugins', 'OAuth integrations', 'Scheduled tasks', 'Background agents'],
  developer: ['GitHub', 'Vercel', 'Supabase', 'API keys', 'Webhooks', 'OpenAPI tools', 'Custom tools', 'Tool permissions', 'Usage analytics'],
  generativeUI: ['Dynamic cards', 'Tables', 'Forms', 'Charts', 'Maps', 'Interactive previews', 'Tool result components', 'Agent progress surfaces'],
  security: ['Encrypted secrets', 'Permission scopes', 'Audit logs', 'Rate limits', 'Data controls', 'Session controls', 'Organization workspaces'],
} as const

export type ClueFeatureGroup = keyof typeof clueFeatures
