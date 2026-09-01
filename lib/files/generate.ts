import { Document, Packer, Paragraph, TextRun } from 'docx'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import ExcelJS from 'exceljs'
import pptxgen from 'pptxgenjs'
import archiver from 'archiver'
import { Readable } from 'node:stream'

type Content = { title?: string; text?: string; rows?: string[][]; slides?: { title: string; text: string }[]; files?: { name: string; content: string }[] }

function safeName(name: string, ext: string) {
  const base = (name || 'clue-file').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'clue-file'
  return base.toLowerCase().endsWith(ext) ? base : `${base}${ext}`
}

export async function generateDocx(c: Content) {
  const doc = new Document({ sections: [{ children: [new Paragraph({ children: [new TextRun({ text: c.title || 'Clue Document', bold: true, size: 32 })] }), ...(c.text || '').split(/\n+/).map(text => new Paragraph(text))] }] })
  return Packer.toBuffer(doc)
}

export async function generatePdf(c: Content) {
  const pdf = await PDFDocument.create(); const page = pdf.addPage(); const font = await pdf.embedFont(StandardFonts.Helvetica)
  const title = c.title || 'Clue Document'; page.drawText(title, { x: 50, y: 760, size: 20, font, color: rgb(0,0,0) })
  const lines = (c.text || '').split(/\n/); let y = 730
  for (const line of lines) { for (let i=0;i<line.length;i+=100) { page.drawText(line.slice(i,i+100), { x:50, y, size:11, font }); y -= 18; if (y < 50) { y=760; pdf.addPage() } } }
  return Buffer.from(await pdf.save())
}

export async function generateXlsx(c: Content) {
  const wb = new ExcelJS.Workbook(); const ws = wb.addWorksheet(c.title || 'Sheet1')
  const rows = c.rows?.length ? c.rows : [[c.title || 'Clue'], ...(c.text || '').split(/\n/).map(x => [x])]
  rows.forEach(r => ws.addRow(r)); ws.columns.forEach(col => { col.width = Math.min(60, Math.max(12, ...(col.values || []).map(v => String(v ?? '').length + 2))) })
  return Buffer.from(await wb.xlsx.writeBuffer())
}

export async function generatePptx(c: Content) {
  const ppt = new pptxgen(); ppt.layout = 'LAYOUT_WIDE'
  const slides = c.slides?.length ? c.slides : [{ title: c.title || 'Clue', text: c.text || '' }]
  for (const s of slides) { const slide = ppt.addSlide(); slide.addText(s.title, { x:0.7,y:0.6,w:11.5,h:0.6,fontSize:26,bold:true }); slide.addText(s.text, { x:0.7,y:1.4,w:11.5,h:5.2,fontSize:16,breakLine:false,fit:'shrink' }) }
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
