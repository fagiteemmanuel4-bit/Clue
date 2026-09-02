import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'

const root = path.join(process.cwd(), 'skills')

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => [])
  const files = []
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) files.push(...await walk(full))
    else if (/\.(md|skill)$/i.test(entry.name) && entry.name.toLowerCase() !== 'sources.json') files.push(full)
  }
  return files
}

function frontmatter(text) {
  const match = text.match(/^---\s*\n([\s\S]*?)\n---\s*\n/)
  if (!match) return null
  const fields = new Set(match[1].split('\n').map(line => line.split(':')[0]?.trim()).filter(Boolean))
  return fields.has('name') && fields.has('description')
}

const files = await walk(root)
if (!files.length) throw new Error('No skill files found.')
let failures = 0
for (const file of files) {
  const text = await readFile(file, 'utf8')
  if (!text.trim()) { console.error(`EMPTY ${file}`); failures++; continue }
  if (!frontmatter(text)) { console.error(`INVALID_FRONTMATTER ${file}`); failures++; continue }
  console.log(`OK ${path.relative(process.cwd(), file)}`)
}
if (failures) process.exit(1)
console.log(`Skill validation passed: ${files.length} skill file(s).`)
