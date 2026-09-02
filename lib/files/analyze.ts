import ExcelJS from 'exceljs'
import JSZip from 'jszip'
import pdfParse from 'pdf-parse'

export type AnalysisResult = {
  name: string
  type: string
  size: number
  kind: 'text' | 'spreadsheet' | 'pdf' | 'document' | 'json' | 'image' | 'unsupported'
  text: string
  summary: string
  rows?: number
  columns?: number
  sheets?: string[]
  stats?: Record<string, { count: number; missing: number; min?: number; max?: number; mean?: number }>
  sample?: unknown[][]
}

const MAX_BYTES = 15 * 1024 * 1024
const clean = (value: unknown) => String(value ?? '').replace(/\u0000/g, '').trim()

function csvRows(input: string): string[][] {
  const rows: string[][] = []
  let row: string[] = [], cell = '', quoted = false
  for (let i = 0; i < input.length; i++) {
    const ch = input[i]
    if (ch === '"') {
      if (quoted && input[i + 1] === '"') { cell += '"'; i++ }
      else quoted = !quoted
    } else if (ch === ',' && !quoted) { row.push(cell); cell = '' }
    else if ((ch === '\n' || ch === '\r') && !quoted) {
      if (ch === '\r' && input[i + 1] === '\n') i++
      row.push(cell); cell = ''
      if (row.some(v => v.trim() !== '')) rows.push(row)
      row = []
    } else cell += ch
  }
  row.push(cell)
  if (row.some(v => v.trim() !== '')) rows.push(row)
  return rows
}

function analyzeTable(rows: unknown[][]) {
  const normalized = rows.map(r => Array.from(r, clean))
  const columns = Math.max(0, ...normalized.map(r => r.length))
  const headers = (normalized[0] || []).map((v, i) => v || `Column ${i + 1}`)
  const stats: AnalysisResult['stats'] = {}
  for (let c = 0; c < columns; c++) {
    const values = normalized.slice(1).map(r => r[c] ?? '')
    const numeric = values.map(Number).filter(v => Number.isFinite(v))
    stats![headers[c] || `Column ${c + 1}`] = {
      count: values.length,
      missing: values.filter(v => !v).length,
      ...(numeric.length ? { min: Math.min(...numeric), max: Math.max(...numeric), mean: numeric.reduce((a, b) => a + b, 0) / numeric.length } : {}),
    }
  }
  const sample = normalized.slice(0, 8)
  const summary = `Dataset has ${Math.max(0, normalized.length - 1)} data rows and ${columns} columns. ${Object.values(stats).filter(s => s.mean !== undefined).length} columns contain numeric values. ${Object.values(stats).reduce((n, s) => n + s.missing, 0)} cells are blank in the sampled structure.`
  const text = [
    `HEADERS: ${headers.join(' | ')}`,
    `ROWS: ${Math.max(0, normalized.length - 1)}`,
    `COLUMNS: ${columns}`,
    `SUMMARY: ${summary}`,
    `STATISTICS: ${JSON.stringify(stats)}`,
    `SAMPLE:\n${sample.map(r => r.join(' | ')).join('\n')}`,
  ].join('\n')
  return { columns, stats, sample, summary, text }
}

async function parseDocx(buffer: Buffer) {
  const zip = await JSZip.loadAsync(buffer)
  const xml = await zip.file('word/document.xml')?.async('text')
  if (!xml) throw new Error('The Word document does not contain readable document.xml content.')
  const text = xml.replace(/<w:tab[^>]*\/>/g, '\t').replace(/<w:br[^>]*\/>/g, '\n').replace(/<\/w:p>/g, '\n').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  return text.replace(/\n{3,}/g, '\n\n').trim()
}

export async function analyzeFile(file: File): Promise<AnalysisResult> {
  const buffer = Buffer.from(await file.arrayBuffer())
  if (buffer.length > MAX_BYTES) throw new Error('Files larger than 15 MB are not supported by the analysis pipeline yet.')
  const name = file.name || 'uploaded-file'
  const lower = name.toLowerCase()
  const type = file.type || 'application/octet-stream'

  if (type.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg)$/i.test(lower)) {
    return { name, type, size: buffer.length, kind: 'image', text: `IMAGE FILE: ${name}\nMIME: ${type}\nSIZE: ${buffer.length} bytes`, summary: 'Image uploaded. Visual understanding can be added through a vision provider; this pipeline preserves the file metadata safely.' }
  }

  if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)
    const allRows: unknown[][] = []
    const sheets: string[] = []
    workbook.worksheets.forEach(sheet => {
      sheets.push(sheet.name)
      sheet.eachRow({ includeEmpty: false }, row => allRows.push(row.values as unknown[]))
    })
    const result = analyzeTable(allRows)
    return { name, type, size: buffer.length, kind: 'spreadsheet', sheets, rows: Math.max(0, allRows.length - 1), columns: result.columns, stats: result.stats, sample: result.sample, summary: `${result.summary} Workbook sheets: ${sheets.join(', ') || 'none'}.`, text: `WORKBOOK SHEETS: ${sheets.join(', ')}\n${result.text}` }
  }

  if (lower.endsWith('.csv') || type === 'text/csv') {
    const rows = csvRows(buffer.toString('utf8'))
    const result = analyzeTable(rows)
    return { name, type, size: buffer.length, kind: 'spreadsheet', rows: Math.max(0, rows.length - 1), columns: result.columns, stats: result.stats, sample: result.sample, summary: result.summary, text: result.text }
  }

  if (lower.endsWith('.pdf') || type === 'application/pdf') {
    const parsed = await pdfParse(buffer)
    const text = clean(parsed.text).slice(0, 100000)
    return { name, type, size: buffer.length, kind: 'pdf', text, summary: `PDF contains approximately ${parsed.numpages} page${parsed.numpages === 1 ? '' : 's'} and ${text.length} extracted characters.` }
  }

  if (lower.endsWith('.docx') || type.includes('wordprocessingml')) {
    const text = await parseDocx(buffer)
    return { name, type, size: buffer.length, kind: 'document', text: text.slice(0, 100000), summary: `Word document parsed successfully with ${text.length} extracted characters.` }
  }

  if (lower.endsWith('.json') || type === 'application/json') {
    const parsed = JSON.parse(buffer.toString('utf8'))
    const pretty = JSON.stringify(parsed, null, 2).slice(0, 100000)
    const rows = Array.isArray(parsed) ? parsed : undefined
    return { name, type, size: buffer.length, kind: 'json', rows: rows?.length, text: pretty, summary: Array.isArray(parsed) ? `JSON array with ${parsed.length} records.` : 'JSON object parsed successfully.' }
  }

  if (type.startsWith('text/') || /\.(txt|md|log|xml|html|js|ts|tsx|jsx|py|java|go|rs|css)$/i.test(lower)) {
    const text = buffer.toString('utf8').slice(0, 100000)
    return { name, type, size: buffer.length, kind: 'text', text, summary: `Text file parsed successfully with ${text.length} extracted characters.` }
  }

  return { name, type, size: buffer.length, kind: 'unsupported', text: '', summary: 'The file was received, but this file type is not supported by the current parser.' }
}
