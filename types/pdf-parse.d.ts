declare module 'pdf-parse' {
  type PdfParseResult = {
    text: string;
    numpages?: number;
    numrender?: number;
    info?: Record<string, unknown>;
    metadata?: unknown;
    version?: string;
  };

  type PdfParse = (data: Buffer, options?: Record<string, unknown>) => Promise<PdfParseResult>;
  const pdfParse: PdfParse;
  export default pdfParse;
}
