import JSZip from 'jszip';
import ExcelJS from 'exceljs';
import { z } from 'zod';

export const parsedFileSchema = z.object({
  name: z.string(),
  type: z.string(),
  size: z.number(),
  text: z.string(),
  rows: z.array(z.record(z.string(), z.string())).optional(),
  metadata: z.record(z.string(), z.string()).optional(),
});

const MAX_BYTES = 15 * 1024 * 1024;
const MAX_TEXT = 120_000;

function clean(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

async function zipXmlText(buffer: Buffer, entry: string) {
  const zip = await JSZip.loadAsync(buffer);
  const file = zip.file(entry);
  if (!file) return '';
  const xml = await file.async('string');
  return clean(xml
    .replace(/<w:tab\s*\/>/g, '\t')
    .replace(/<a:br\s*\/>|<w:br\s*\/>/g, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'));
}

async function parseDocx(buffer: Buffer) {
  return zipXmlText(buffer, 'word/document.xml');
}

async function parsePptx(buffer: Buffer) {
  const zip = await JSZip.loadAsync(buffer);
  const slides = Object.keys(zip.files).filter(k => /^ppt\/slides\/slide\d+\.xml$/.test(k)).sort();
  const chunks: string[] = [];
  for (const slide of slides) {
    const text = await zipXmlText(buffer, slide);
    if (text) chunks.push(text);
  }
  return chunks.join('\n\n');
}

async function parseXlsx(buffer: Buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const rows: Record<string, string>[] = [];
  const text: string[] = [];
  workbook.eachSheet((sheet) => {
    text.push(`Sheet: ${sheet.name}`);
    let headers: string[] = [];
    sheet.eachRow((row, rowNumber) => {
      const values = (row.values as unknown[]).slice(1).map(v => v == null ? '' : String(v));
      if (rowNumber === 1) {
        headers = values.map((v, i) => v || `Column ${i + 1}`);
      } else if (values.some(Boolean)) {
        const record: Record<string, string> = {};
        values.forEach((v, i) => { record[headers[i] || `Column ${i + 1}`] = v; });
        rows.push(record);
      }
      text.push(values.join('\t'));
    });
  });
  return { text: text.join('\n'), rows };
}

function parseDelimited(text: string) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (!lines.length) return { rows: [] as Record<string, string>[] };
  const delimiter = lines[0].includes('\t') ? '\t' : ',';
  const headers = lines[0].split(delimiter).map((h, i) => h.trim() || `Column ${i + 1}`);
  const rows = lines.slice(1).map(line => {
    const values = line.split(delimiter).map(v => v.trim().replace(/^"|"$/g, ''));
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? '']));
  });
  return { rows };
}

export async function parseUploadedFile(file: File) {
  if (file.size > MAX_BYTES) throw new Error('File is larger than the 15 MB limit.');
  const buffer = Buffer.from(await file.arrayBuffer());
  const name = file.name;
  const lower = name.toLowerCase();
  let text = '';
  let rows: Record<string, string>[] | undefined;

  if (lower.endsWith('.docx')) text = await parseDocx(buffer);
  else if (lower.endsWith('.pptx')) text = await parsePptx(buffer);
  else if (lower.endsWith('.xlsx')) ({ text, rows } = await parseXlsx(buffer));
  else if (lower.endsWith('.csv') || lower.endsWith('.tsv')) {
    text = buffer.toString('utf8');
    rows = parseDelimited(text).rows;
  } else if (lower.endsWith('.json')) {
    const raw = buffer.toString('utf8');
    const data = JSON.parse(raw);
    text = JSON.stringify(data, null, 2);
    if (Array.isArray(data) && data.every(v => v && typeof v === 'object')) rows = data.map(v => Object.fromEntries(Object.entries(v).map(([k, val]) => [k, String(val ?? '')])));
  } else if (lower.endsWith('.txt') || lower.endsWith('.md') || file.type.startsWith('text/')) {
    text = buffer.toString('utf8');
  } else if (file.type === 'application/pdf' || lower.endsWith('.pdf')) {
    // PDF extraction is delegated to the optional PDF parser when installed.
    const mod = await import('pdf-parse');
    const parsed = await mod.default(buffer);
    text = parsed.text || '';
  } else if (file.type.startsWith('image/')) {
    return parsedFileSchema.parse({ name, type: file.type, size: file.size, text: '', metadata: { analysis: 'image-ready' } });
  } else {
    throw new Error('Unsupported file type. Use PDF, DOCX, PPTX, XLSX, CSV, TSV, JSON, TXT, Markdown, or an image.');
  }

  return parsedFileSchema.parse({ name, type: file.type || 'application/octet-stream', size: file.size, text: text.slice(0, MAX_TEXT), rows: rows?.slice(0, 5000) });
}
