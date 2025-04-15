/**
 * Document Middleware
 * Specialized middleware for document generation and serving
 */
import express from 'express';
import path from 'path';
import fs from 'fs/promises';
import { jsPDF } from 'jspdf';
import type { Request, Response, NextFunction } from 'express';

interface DocumentRequest extends Request {
  documentContext?: {
    title: string;
    content: string;
    fileName?: string;
    outputPath?: string;
  };
}

/**
 * Initialize document generation middleware
 */
export function initDocumentMiddleware(app: express.Application): void {
  // Document directories
  const documentsDir = path.join(process.cwd(), 'uploads', 'documents');
  
  // Ensure documents directory exists
  (async () => {
    try {
      await fs.mkdir(documentsDir, { recursive: true });
      console.log('Document directories initialized');
    } catch (error) {
      console.error('Error creating document directories:', error);
    }
  })();
  
  // Serve static document files with appropriate headers
  app.use('/documents', express.static(documentsDir, {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.pdf')) {
        res.setHeader('Content-Type', 'application/pdf');
        const fileName = path.basename(filePath);
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      }
    }
  }));
  
  // Document generation middleware
  app.use('/api/documents/generate', prepareDocument);
  app.use('/api/documents/generate', generateDocument);
  app.post('/api/documents/generate', (req: Request, res: Response) => {
    const docReq = req as DocumentRequest;
    if (!docReq.documentContext?.outputPath) {
      return res.status(500).json({
        success: false,
        error: 'Document generation failed',
        details: 'No output path was generated'
      });
    }
    
    const fileName = path.basename(docReq.documentContext.outputPath);
    return res.json({
      success: true,
      message: 'Document generated successfully',
      fileName,
      downloadUrl: `/documents/${fileName}`
    });
  });
  
  // Direct PDF serving for document downloads
  app.get('/api/documents/direct/:fileName', async (req: Request, res: Response) => {
    try {
      const fileName = req.params.fileName;
      if (!fileName) {
        return res.status(400).json({ success: false, error: 'No filename provided' });
      }
      
      const filePath = path.join(documentsDir, fileName);
      
      // Check if file exists
      try {
        await fs.access(filePath);
      } catch (err) {
        return res.status(404).json({ success: false, error: 'Document not found' });
      }
      
      // Set appropriate headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      
      // Send the file directly
      return res.sendFile(filePath);
    } catch (error) {
      console.error('Error serving document:', error);
      return res.status(500).json({
        success: false,
        error: 'Document serving failed',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });
}

/**
 * Middleware to prepare document generation context
 */
async function prepareDocument(req: DocumentRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { title, content, documentType } = req.body;
    
    if (!title || !content) {
      res.status(400).json({ success: false, error: 'Title and content are required' });
      return;
    }
    
    // Create a unique filename
    const timestamp = Date.now();
    const safeTitle = title.replace(/[^a-z0-9]/gi, '-').toLowerCase();
    const fileName = `${safeTitle}-${timestamp}.pdf`;
    const outputPath = path.join(process.cwd(), 'uploads', 'documents', fileName);
    
    // Set document context
    req.documentContext = {
      title,
      content,
      fileName,
      outputPath
    };
    
    console.log('Document context prepared:', req.documentContext);
    next();
  } catch (error) {
    console.error('Error preparing document:', error);
    res.status(500).json({
      success: false,
      error: 'Document preparation failed',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Middleware to generate PDF document
 */
async function generateDocument(req: DocumentRequest, res: Response, next: NextFunction): Promise<void> {
  if (!req.documentContext) {
    res.status(500).json({ success: false, error: 'Document context not initialized' });
    return;
  }
  
  try {
    const { title, content, outputPath } = req.documentContext;
    
    // Generate PDF using jsPDF
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(18);
    doc.text(title, 20, 20);
    
    // Add content
    doc.setFontSize(12);
    const textLines = doc.splitTextToSize(content, 170);
    doc.text(textLines, 20, 30);
    
    // Add metadata
    doc.setProperties({
      title,
      subject: 'Generated Document',
      author: 'Document Generator',
      creator: 'Requirements Management System'
    });
    
    // Save PDF to file
    const pdfOutput = doc.output();
    await fs.writeFile(outputPath as string, Buffer.from(pdfOutput, 'binary'));
    
    console.log(`Document generated at: ${outputPath}`);
    next();
  } catch (error) {
    console.error('Error generating document:', error);
    res.status(500).json({
      success: false,
      error: 'Document generation failed',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}