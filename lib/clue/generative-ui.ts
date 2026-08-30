export type UIComponent =
  | { type: 'card'; title?: string; body: string }
  | { type: 'table'; columns: string[]; rows: string[][] }
  | { type: 'checklist'; items: { label: string; done?: boolean }[] }
  | { type: 'progress'; label?: string; value: number }

export type UISpec = { version: 1; components: UIComponent[] }

const componentTypes = new Set(['card', 'table', 'checklist', 'progress'])

export function validateUISpec(value: unknown): UISpec | null {
  if (!value || typeof value !== 'object') return null
  const input = value as { version?: unknown; components?: unknown }
  if (input.version !== 1 || !Array.isArray(input.components)) return null
  const components: UIComponent[] = []
  for (const item of input.components.slice(0, 20)) {
    if (!item || typeof item !== 'object') continue
    const component = item as Record<string, unknown>
    if (typeof component.type !== 'string' || !componentTypes.has(component.type)) continue
    if (component.type === 'card' && typeof component.body === 'string') {
      components.push({ type: 'card', title: typeof component.title === 'string' ? component.title.slice(0, 120) : undefined, body: component.body.slice(0, 5000) })
    }
    if (component.type === 'table' && Array.isArray(component.columns) && Array.isArray(component.rows)) {
      const columns = component.columns.filter((x): x is string => typeof x === 'string').slice(0, 20)
      const rows = component.rows.slice(0, 100).map(row => Array.isArray(row) ? row.filter((x): x is string => typeof x === 'string').slice(0, 20) : [])
      if (columns.length) components.push({ type: 'table', columns, rows })
    }
    if (component.type === 'checklist' && Array.isArray(component.items)) {
      const items = component.items.slice(0, 50).flatMap(item => {
        if (!item || typeof item !== 'object') return []
        const i = item as Record<string, unknown>
        return typeof i.label === 'string' ? [{ label: i.label.slice(0, 300), done: Boolean(i.done) }] : []
      })
      components.push({ type: 'checklist', items })
    }
    if (component.type === 'progress' && typeof component.value === 'number') {
      components.push({ type: 'progress', label: typeof component.label === 'string' ? component.label.slice(0, 120) : undefined, value: Math.max(0, Math.min(100, component.value)) })
    }
  }
  return { version: 1, components }
}
