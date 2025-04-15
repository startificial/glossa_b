/**
 * Standalone Document Server
 * This is a separate express app dedicated to serving documents
 */
const express = require('express');
const { jsPDF } = require('jspdf');
const fs = require('fs');
const path = require('path');

// Create Express server
const app = express();
const port = 5001;

// Middleware for parsing JSON
app.use(express.json());

// Create documents directory if it doesn't exist
const documentsDir = path.join(process.cwd(), 'uploads', 'documents');
if (!fs.existsSync(documentsDir)) {
  fs.mkdirSync(documentsDir, { recursive: true });
}

// Serve static documents with proper MIME types
app.use('/documents', express.static(documentsDir, {
  setHeaders: (res, filePath) => {
    console.log('Serving static file:', filePath);
    if (filePath.endsWith('.pdf')) {
      console.log('Setting PDF headers');
      res.setHeader('Content-Type', 'application/pdf');
    }
  }
}));

// Generate a simple test document
app.get('/api/test-document', async (req, res) => {
  try {
    // Generate a simple PDF
    const timestamp = Date.now();
    const fileName = `test-document-${timestamp}.pdf`;
    const outputPath = path.join(documentsDir, fileName);
    
    // Create a new document
    const doc = new jsPDF();
    
    // Add content
    doc.setFontSize(18);
    doc.text('Test Document', 20, 20);
    
    doc.setFontSize(12);
    doc.text('This is a test document generated for debugging.', 20, 30);
    doc.text(`Generated at: ${new Date().toISOString()}`, 20, 40);
    
    // Save the PDF
    const pdfOutput = doc.output();
    fs.writeFileSync(outputPath, Buffer.from(pdfOutput, 'binary'));
    
    console.log(`Generated test document at: ${outputPath}`);
    
    // Return success response
    return res.json({
      success: true,
      message: 'Document generated successfully',
      fileName: fileName,
      downloadUrl: `/documents/${fileName}`
    });
  } catch (error) {
    console.error('Error generating test document:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate test document',
      details: error.message
    });
  }
});

// Download a generated document
app.get('/api/download/:fileName', (req, res) => {
  const { fileName } = req.params;
  const filePath = path.join(documentsDir, fileName);
  
  console.log(`Download request for: ${fileName}`);
  console.log(`Looking at path: ${filePath}`);
  
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    console.log('File not found');
    return res.status(404).json({
      success: false,
      error: 'Document not found'
    });
  }
  
  console.log('File found, serving download');
  
  // Serve the file
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  
  // Stream the file
  return res.sendFile(filePath);
});

// Start the server
app.listen(port, '0.0.0.0', () => {
  console.log(`Document server running on http://0.0.0.0:${port}`);
});