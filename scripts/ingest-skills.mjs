import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const sourceFile = path.join(root, 'skills', 'sources.json')
const outputRoot = path.join(root, 'skills', 'external')

function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function parseFrontmatter(text) {
  const match = text.match(/^---\s*\n([\s\S]*?)\n---\s*\n/)
  if (!match) return {}
  return Object.fromEntries(match[1].split('\n').flatMap(line => {
    const i = line.indexOf(':')
    return i > 0 ? [[line.slice(0, i).trim(), line.slice(i + 1).trim().replace(/^['"]|['"]$/g, '')]] : []
  }))
}

function riskFlags(text) {
  const rules = [
    [/rm\s+-rf\s+\//i, 'destructive filesystem command'],
    [/(curl|wget)[^\n|]*\|\s*(sh|bash)/i, 'remote shell piping'],
    [/-----BEGIN (RSA|OPENSSH|EC|PRIVATE) KEY-----/i, 'embedded private key'],
    [/(export|set)\s+[A-Z_]*(API_KEY|TOKEN|PASSWORD|SECRET)/i, 'credential manipulation'],
    [/chmod\s+\+x[^\n]*\b(curl|wget)/i, 'downloaded executable activation'],
  ]
  return rules.filter(([pattern]) => pattern.test(text)).map(([, label]) => label)
}

async function fetchGitHubFile(repo, filePath) {
  const url = `https://raw.githubusercontent.com/${repo}/HEAD/${filePath}`
  const response = await fetch(url, { headers: { 'User-Agent': 'Clue-Skill-Ingestor/1.0' } })
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)
  return response.text()
}

async function main() {
  const config = JSON.parse(await readFile(sourceFile, 'utf8'))
  await mkdir(outputRoot, { recursive: true })
  let imported = 0
  let blocked = 0
  for (const source of config.sources || []) {
    for (const filePath of source.paths || []) {
      if (!/(^|\/)SKILL\.md$|\.skill$/i.test(filePath)) continue
      try {
        const content = await fetchGitHubFile(source.repository, filePath)
        const flags = riskFlags(content)
        if (flags.length) {
          blocked++
          console.warn(`BLOCKED ${source.repository}/${filePath}: ${flags.join(', ')}`)
          continue
        }
        const meta = parseFrontmatter(content)
        const id = slug(`${source.repository.replace('/', '-')}-${meta.name || path.basename(path.dirname(filePath))}`)
        const targetDir = path.join(outputRoot, slug(source.repository))
        await mkdir(targetDir, { recursive: true })
        const header = `<!-- Clue ingestion metadata: ${source.repository}/${filePath}; imported ${new Date().toISOString()} -->\n`
        await writeFile(path.join(targetDir, `${id}.md`), header + content)
        imported++
        console.log(`Imported ${source.repository}/${filePath}`)
      } catch (error) {
        console.warn(`Skipped ${source.repository}/${filePath}:`, error instanceof Error ? error.message : error)
      }
    }
  }
  console.log(`Skill ingestion complete: ${imported} imported, ${blocked} blocked.`)
}

main().catch(error => { console.error(error); process.exit(1) })
