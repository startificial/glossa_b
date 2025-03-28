declare module 'pdf-parse' {
  interface PDFData {
    text: string;
    numpages: number;
    info: {
      Author?: string;
      CreationDate?: string;
      Creator?: string;
      ModDate?: string;
      Producer?: string;
      Title?: string;
      [key: string]: any;
    };
    metadata?: any;
    version?: string;
  }

  function parse(dataBuffer: Buffer, options?: any): Promise<PDFData>;
  
  export default parse;
}