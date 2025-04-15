// A simple script to generate a test PDF for testing document generation
const { jsPDF } = require('jspdf');
const fs = require('fs');
const path = require('path');

async function generateTestDocument() {
  const outputDir = path.join(process.cwd(), 'uploads', 'documents');
  const timestamp = Date.now();
  const fileName = `test-document-${timestamp}.pdf`;
  const outputPath = path.join(outputDir, fileName);
  
  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Create a new PDF document
  const doc = new jsPDF();
  
  // Add content
  doc.setFontSize(18);
  doc.text('Test Document', 20, 20);
  
  doc.setFontSize(12);
  doc.text('This is a test document generated for debugging purposes.', 20, 30);
  doc.text(`Generated at: ${new Date().toISOString()}`, 20, 40);
  doc.text('If you can see this PDF, document serving is working correctly.', 20, 50);
  
  // Add some metadata
  doc.setProperties({
    title: 'Test Document',
    subject: 'PDF Generation Test',
    author: 'Document Generator',
    keywords: 'test, pdf, debug',
    creator: 'Test Script'
  });
  
  // Save the PDF
  const pdfOutput = doc.output();
  fs.writeFileSync(outputPath, Buffer.from(pdfOutput, 'binary'));
  
  console.log(`Generated test document at: ${outputPath}`);
  console.log(`Downloadable at: /downloads/documents/${fileName}`);
  
  return {
    path: outputPath,
    fileName,
    downloadUrl: `/downloads/documents/${fileName}`
  };
}

// Run the generator
generateTestDocument()
  .then(result => {
    console.log('Document generation successful:');
    console.log(result);
  })
  .catch(error => {
    console.error('Error generating document:', error);
  });