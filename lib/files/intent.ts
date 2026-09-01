import { generators, fileNameFor, type FileFormat } from '@/lib/files/generate'

export type FileIntent = { format: FileFormat; filename: string; title: string; request: string }
const rules: Array<{ format: FileFormat; patterns: RegExp[] }> = [
  { format: 'docx', patterns: [/\b(word|docx|document)\b/i, /\bformal business letter\b/i] },
  { format: 'pdf', patterns: [/\bpdf\b/i, /\bportable document\b/i] },
  { format: 'xlsx', patterns: [/\b(excel|xlsx|spreadsheet|workbook|table)\b/i] },
  { format: 'pptx', patterns: [/\b(powerpoint|pptx|presentation|slides?)\b/i] },
  { format: 'zip', patterns: [/\bzip\b/i, /\bzip archive\b/i] },
]
export function detectFileIntent(prompt: string): FileIntent | null {
  if (!/\b(create|make|generate|prepare|produce|build|export|write)\b/i.test(prompt)) return null
  const rule = rules.find(r => r.patterns.some(p => p.test(prompt))); if (!rule) return null
  const titleMatch = prompt.match(/(?:called|named|titled)\s+["']?([^"'\n]+?)["']?(?:\s+(?:as|with|for)\b|$)/i)
  const title = titleMatch?.[1]?.trim() || (rule.format === 'docx' && /formal business letter/i.test(prompt) ? 'Formal Business Letter' : 'Clue Document')
  return { format: rule.format, filename: fileNameFor(rule.format, title), title, request: prompt }
}

type Composed = { title: string; text?: string; rows?: string[][]; slides?: { title: string; text: string }[]; files?: { name: string; content: string }[] }
function extractJson(value: string): Composed { const cleaned = value.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim(); const start = cleaned.indexOf('{'); const end = cleaned.lastIndexOf('}'); if (start < 0 || end <= start) throw new Error('AI returned invalid file content.'); return JSON.parse(cleaned.slice(start, end + 1)) as Composed }

async function composeWithAI(intent: FileIntent): Promise<Composed> {
  const key = process.env.OPENROUTER_API_KEY?.trim() || process.env.AI_API_KEY?.trim(); if (!key) throw new Error('No AI provider is configured.')
  const base = (process.env.AI_BASE_URL?.trim() || 'https://openrouter.ai/api/v1').replace(/\/$/, ''); const configuredModel = process.env.AI_MODEL?.trim() || 'openrouter/free'
  const candidates = [configuredModel, 'openai/gpt-oss-120b:free', 'meta-llama/llama-3.2-3b-instruct:free'].filter((x,i,a) => x && a.indexOf(x) === i).slice(0,3)
  const schema = intent.format === 'xlsx' ? '{"title":"string","rows":[["cell","cell"]]}' : intent.format === 'pptx' ? '{"title":"string","slides":[{"title":"string","text":"string"}]}' : intent.format === 'zip' ? '{"title":"string","files":[{"name":"README.md","content":"string"}]}' : '{"title":"string","text":"string"}'
  const system = `You are Clue's professional document production engine. Turn the user's request into COMPLETE, useful, polished file content. Never output code, implementation instructions, placeholders, or boilerplate unless explicitly requested. For Word/PDF, write the actual document with headings, sections, lists and professional wording. For spreadsheets, create a real structured dataset/table with a header row, meaningful rows, and useful columns; never return spreadsheet code or markdown. For presentations, create coherent slides with concise speaker-ready content. Return ONLY valid JSON matching this shape: ${schema}`
  let lastError: unknown = null
  for (const model of candidates) {
    try {
      const response = await fetch(`${base}/chat/completions`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}`, 'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://clue-nmmn.vercel.app', 'X-Title': 'Clue' }, body: JSON.stringify({ model, temperature: 0.35, max_tokens: 6000, stream: false, messages: [{ role: 'system', content: system }, { role: 'user', content: `Create the file requested below. Preserve every important requirement and make reasonable professional choices without asking follow-up questions.\n\n${intent.request}` }] }) })
      if (!response.ok) { lastError = new Error(`AI file composition failed (${response.status}).`); continue }
      const json = await response.json() as { choices?: Array<{ message?: { content?: string } }> }; const content = json.choices?.[0]?.message?.content
      if (!content?.trim()) { lastError = new Error('AI returned empty file content.'); continue }
      return extractJson(content)
    } catch (error) { lastError = error }
  }
  throw lastError instanceof Error ? lastError : new Error('AI file composition failed.')
}

function contentForRecall(content: Composed) { if (content.rows?.length) return content.rows.map(row => row.join('\t')).join('\n'); if (content.slides?.length) return content.slides.map(slide => `# ${slide.title}\n${slide.text}`).join('\n\n'); if (content.files?.length) return content.files.map(file => `## ${file.name}\n${file.content}`).join('\n\n'); return content.text || '' }

export async function executeFileIntent(intent: FileIntent) {
  const content = await composeWithAI(intent); if (!content.title) content.title = intent.title
  if (intent.format !== 'xlsx' && intent.format !== 'pptx' && intent.format !== 'zip' && !content.text?.trim()) throw new Error('AI produced an empty document.')
  if (intent.format === 'xlsx' && (!content.rows?.length || content.rows.length < 2)) throw new Error('AI produced an empty spreadsheet.')
  if (intent.format === 'pptx' && !content.slides?.length) throw new Error('AI produced an empty presentation.')
  const data = await generators[intent.format](content)
  const mime: Record<FileFormat, string> = { docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', pdf: 'application/pdf', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', zip: 'application/zip' }
  return { name: intent.filename, type: mime[intent.format], size: data.byteLength, bytes: Buffer.from(data).toString('base64'), contentText: contentForRecall(content), text: `I've created **${intent.filename}** with the requested content. Use the download button on the file card to save it.` }
}
