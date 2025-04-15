import * as fs from 'fs/promises';
import * as path from 'path';
import { jsPDF } from 'jspdf';

async function generateTestPDF() {
  try {
    // Create a new jsPDF instance
    const doc = new jsPDF();
    
    // Add some content to the PDF
    doc.setFontSize(16);
    doc.text('Test PDF Document', 20, 20);
    
    doc.setFontSize(12);
    doc.text('This is a test PDF file generated for testing the download functionality.', 20, 30);
    doc.text('If you can see this text, the PDF was successfully generated and downloaded.', 20, 40);
    doc.text('Created on ' + new Date().toLocaleString(), 20, 50);
    
    // Ensure directory exists
    const docDir = path.join(process.cwd(), 'uploads', 'documents');
    await fs.mkdir(docDir, { recursive: true });
    
    // Save the PDF to a file
    const outputPath = path.join(docDir, 'test-download.pdf');
    const pdfOutput = doc.output();
    await fs.writeFile(outputPath, pdfOutput, 'binary');
    
    console.log(`Test PDF created at: ${outputPath}`);
    return outputPath;
  } catch (error) {
    console.error('Error generating test PDF:', error);
    throw error;
  }
}

// Run the function
generateTestPDF()
  .then(path => console.log('Success! File created at:', path))
  .catch(err => console.error('Failed:', err));