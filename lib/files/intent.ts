import { generators, fileNameFor, type FileFormat } from '@/lib/files/generate'

export type FileIntent = {
  format: FileFormat
  filename: string
  title: string
  text: string
}

const rules: Array<{ format: FileFormat; patterns: RegExp[]; label: string }> = [
  { format: 'docx', patterns: [/\b(word|docx|document)\b/i, /\bformal business letter\b/i], label: 'Word document' },
  { format: 'pdf', patterns: [/\bpdf\b/i, /\bportable document\b/i], label: 'PDF document' },
  { format: 'xlsx', patterns: [/\b(excel|xlsx|spreadsheet)\b/i], label: 'Excel spreadsheet' },
  { format: 'pptx', patterns: [/\b(powerpoint|pptx|presentation|slides?)\b/i], label: 'PowerPoint presentation' },
  { format: 'zip', patterns: [/\bzip\b/i, /\b(zip archive|project folder)\b/i], label: 'ZIP archive' },
]

export function detectFileIntent(prompt: string): FileIntent | null {
  if (!/\b(create|make|generate|prepare|produce|build|export)\b/i.test(prompt)) return null
  const rule = rules.find(r => r.patterns.some(p => p.test(prompt)))
  if (!rule) return null
  const titleMatch = prompt.match(/(?:called|named|titled)\s+["']?([^"'\n]+)["']?/i)
  const title = titleMatch?.[1]?.trim() || (rule.format === 'docx' && /formal business letter/i.test(prompt) ? 'Formal Business Letter' : 'Clue Document')
  const filename = fileNameFor(rule.format, title)
  const text = /formal business letter/i.test(prompt)
    ? 'Dear Sir or Madam,\n\nI am writing to formally communicate regarding the matter outlined in this letter. Please review the information and take the appropriate action at your earliest convenience.\n\nThank you for your time and consideration.\n\nYours faithfully,\nClue'
    : prompt.replace(/^.*?\b(?:create|make|generate|prepare|produce|build|export)\b/i, '').trim() || `Generated ${rule.label} by Clue.`
  return { format: rule.format, filename, title, text }
}

export async function executeFileIntent(intent: FileIntent) {
  const content = intent.format === 'zip'
    ? { title: intent.title, text: intent.text, files: [{ name: 'README.md', content: `# ${intent.title}\n\n${intent.text}\n` }] }
    : intent.format === 'xlsx'
      ? { title: intent.title, text: intent.text, rows: [['Clue', 'Generated file'], ['Title', intent.title], ['Content', intent.text]] }
      : intent.format === 'pptx'
        ? { title: intent.title, text: intent.text, slides: [{ title: intent.title, text: intent.text }] }
        : { title: intent.title, text: intent.text }
  const data = await generators[intent.format](content)
  const mime: Record<FileFormat, string> = {
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    pdf: 'application/pdf',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    zip: 'application/zip',
  }
  return {
    name: intent.filename,
    type: mime[intent.format],
    size: data.byteLength,
    bytes: Buffer.from(data).toString('base64'),
    text: `I've created **${intent.filename}** for you. Use the download button on the file card to save it.`,
  }
}
