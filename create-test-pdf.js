import { jsPDF } from 'jspdf';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current file directory (equivalent to __dirname in CommonJS)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create output directory if it doesn't exist
const outputDir = path.join(process.cwd(), 'uploads', 'documents');
fs.mkdirSync(outputDir, { recursive: true });

// Create a new PDF document
const doc = new jsPDF();

// Add a title
doc.setFontSize(16);
doc.text('Test PDF Document', 20, 20);

// Add some text content
doc.setFontSize(12);
doc.text('This is a test PDF document created with jsPDF.', 20, 30);
doc.text('It should download correctly when accessed via the API.', 20, 40);
doc.text('Current date: ' + new Date().toISOString(), 20, 50);

// Save the PDF
const pdfOutput = doc.output();
fs.writeFileSync(path.join(outputDir, 'test-jspdf.pdf'), Buffer.from(pdfOutput, 'binary'));

console.log('Test PDF created successfully at: ' + path.join(outputDir, 'test-jspdf.pdf'));