import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import ExcelJS from 'exceljs'
import pptxgen from 'pptxgenjs'
import archiver from 'archiver'

type Content = { title?: string; text?: string; rows?: string[][]; slides?: { title: string; text: string }[]; files?: { name: string; content: string }[] }

function safeName(name: string, ext: string) {
  const base = (name || 'clue-file').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'clue-file'
  return base.toLowerCase().endsWith(ext) ? base : `${base}${ext}`
}

function wordParagraphs(text: string) {
  return text.split(/\n+/).flatMap(block => {
    const line = block.trim()
    if (!line) return []
    if (/^#{1,3}\s+/.test(line)) return [new Paragraph({ text: line.replace(/^#{1,3}\s+/, ''), heading: HeadingLevel.HEADING_2 })]
    if (/^[-*]\s+/.test(line)) return [new Paragraph({ text: line.replace(/^[-*]\s+/, ''), bullet: { level: 0 } })]
    return [new Paragraph({ children: [new TextRun({ text: line })], spacing: { after: 120 } })]
  })
}

export async function generateDocx(c: Content) {
  const title = c.title || 'Clue Document'
  const doc = new Document({ sections: [{ properties: { page: { margin: { top: 900, right: 900, bottom: 900, left: 900 } } }, children: [new Paragraph({ text: title, heading: HeadingLevel.TITLE }), ...wordParagraphs(c.text || '')] }] })
  return Packer.toBuffer(doc)
}

export async function generatePdf(c: Content) {
  const pdf = await PDFDocument.create(); let page = pdf.addPage(); const font = await pdf.embedFont(StandardFonts.Helvetica)
  const title = c.title || 'Clue Document'; page.drawText(title, { x: 50, y: 760, size: 20, font, color: rgb(0,0,0) })
  const lines = (c.text || '').split(/\n/); let y = 730
  for (const raw of lines) { const line = raw.replace(/^#{1,3}\s+/, '').replace(/^[-*]\s+/, '• '); for (let i=0;i<Math.max(1,line.length);i+=95) { page.drawText(line.slice(i,i+95), { x:50, y, size:11, font }); y -= 18; if (y < 50) { page=pdf.addPage(); y=760 } } }
  return Buffer.from(await pdf.save())
}

function cellValue(value: string) {
  const v = String(value ?? '').trim()
  if (!v) return ''
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v)
  return v
}

export async function generateXlsx(c: Content) {
  const wb = new ExcelJS.Workbook(); wb.creator = 'Clue'; wb.created = new Date()
  const ws = wb.addWorksheet((c.title || 'Sheet1').slice(0,31), { views: [{ state: 'frozen', ySplit: 1 }] })
  const rows = c.rows?.length ? c.rows : [[c.title || 'Clue'], ...(c.text || '').split(/\n/).filter(Boolean).map(x => [x])]
  rows.forEach((row, index) => { const cells = row.map(cellValue); const added = ws.addRow(cells); if (index === 0) { added.font = { bold: true }; added.alignment = { vertical: 'middle', wrapText: true }; added.height = 22 } else { added.alignment = { vertical: 'top', wrapText: true } } })
  if (rows[0]?.length) ws.autoFilter = { from: 'A1', to: `${String.fromCharCode(64 + Math.min(rows[0].length,26))}1` }
  ws.columns.forEach(col => { const values = (col.values || []).slice(1); const max = Math.max(10, ...values.map(v => String(v ?? '').length + 2)); col.width = Math.min(55, max) })
  ws.eachRow((row, rowNumber) => row.eachCell(cell => { if (typeof cell.value === 'number') cell.numFmt = '#,##0.##'; if (rowNumber > 1 && cell.value) cell.border = { bottom: { style: 'hair' } } }))
  return Buffer.from(await wb.xlsx.writeBuffer())
}

export async function generatePptx(c: Content) {
  const ppt = new pptxgen(); ppt.layout = 'LAYOUT_WIDE'; ppt.author = 'Clue'; ppt.subject = c.title || 'Clue presentation'
  const slides = c.slides?.length ? c.slides : [{ title: c.title || 'Clue', text: c.text || '' }]
  for (const s of slides) { const slide = ppt.addSlide(); slide.addText(s.title, { x:0.7,y:0.6,w:11.5,h:0.6,fontSize:26,bold:true }); slide.addText(s.text, { x:0.7,y:1.4,w:11.5,h:5.2,fontSize:16,breakLine:false,fit:'shrink',margin:0.05 }) }
  return Buffer.from(await ppt.write({ outputType: 'nodebuffer' }) as Buffer)
}

export async function generateZip(c: Content) {
  const archive = archiver('zip', { zlib: { level: 9 } }); const chunks: Buffer[] = []
  archive.on('data', chunk => chunks.push(Buffer.from(chunk)))
  const done = new Promise<Buffer>((resolve, reject) => { archive.on('end', () => resolve(Buffer.concat(chunks))); archive.on('error', reject) })
  for (const f of c.files || []) archive.append(f.content, { name: f.name || 'file.txt' })
  await archive.finalize(); return done
}

export function fileNameFor(format: string, name?: string) {
  const exts: Record<string,string> = { docx:'.docx', pdf:'.pdf', xlsx:'.xlsx', pptx:'.pptx', zip:'.zip' }
  if (!exts[format]) throw new Error('Unsupported file format')
  return safeName(name || 'clue-file', exts[format])
}

export const generators = { docx: generateDocx, pdf: generatePdf, xlsx: generateXlsx, pptx: generatePptx, zip: generateZip }
export type FileFormat = keyof typeof generators
