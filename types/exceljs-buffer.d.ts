import ExcelJS from 'exceljs'
import { Buffer } from 'node:buffer'

declare module 'exceljs' {
  interface Workbook {
    xlsx: ExcelJS.Xlsx
  }
}

declare module 'exceljs' {
  interface Xlsx {
    load(data: Buffer<ArrayBufferLike>, options?: unknown): Promise<ExcelJS.Workbook>
  }
}
