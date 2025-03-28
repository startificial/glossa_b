import fs from 'fs';
import util from 'util';
import pdfParse from 'pdf-parse';
import { processTextFile } from './gemini';

// Use promisified versions of fs functions
const readFile = util.promisify(fs.readFile);

/**
 * Cleans PDF text by removing excessive whitespace, formatting characters and common PDF artifacts
 * @param text Raw text extracted from PDF
 * @returns Cleaned text
 */
function cleanPdfText(text: string): string {
  // Replace multiple newlines with a single one
  text = text.replace(/\n{3,}/g, '\n\n');
  
  // Remove PDF artifacts and common formatting issues
  text = text.replace(/\f/g, '\n'); // Form feed
  text = text.replace(/(\r\n|\r)/g, '\n'); // Normalize line endings
  
  // Remove repeated spaces
  text = text.replace(/ {2,}/g, ' ');
  
  // Remove strange unicode control characters
  text = text.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
  
  // Replace common PDF extraction artifacts
  text = text.replace(/([A-Za-z]),([A-Za-z])/g, '$1, $2'); // Add space after commas
  text = text.replace(/\.([A-Z])/g, '. $1'); // Add space after periods
  
  // Remove page numbers and headers/footers patterns
  text = text.replace(/\n\s*\d+\s*\n/g, '\n'); // Isolated page numbers
  text = text.replace(/\n.*Page \d+ of \d+.*/gi, ''); // Page X of Y patterns
  
  // Fix bullets and lists which can get mangled in PDFs
  text = text.replace(/\n[•·\-–—] */g, '\n• ');
  
  // Join paragraphs split across lines inappropriately
  text = text.replace(/([a-z,;:])(?:\s*\n\s*)([a-z])/g, '$1 $2');
  
  // Remove excessive spacing at the beginning of lines
  text = text.replace(/\n\s+/g, '\n');
  
  return text.trim();
}

/**
 * Extract text content from a PDF file with better cleaning and structure preservation
 * @param filePath Path to the PDF file
 * @returns Cleaned text extracted from the PDF
 */
export async function extractTextFromPdf(filePath: string): Promise<string> {
  try {
    // Read the PDF file
    const dataBuffer = await readFile(filePath);
    
    // Parse PDF to extract text
    const pdfData = await pdfParse(dataBuffer);
    
    // Clean the extracted text
    const cleanedText = cleanPdfText(pdfData.text);
    
    console.log(`PDF processed: ${filePath}`);
    console.log(`Extracted ${cleanedText.length} characters of text`);
    
    return cleanedText;
  } catch (error) {
    console.error(`Error extracting text from PDF: ${error}`);
    throw new Error(`Failed to extract text from PDF: ${error}`);
  }
}

/**
 * Split PDF text into logical sections based on headings and structure
 * @param text PDF text content
 * @returns Array of text sections
 */
function splitPdfIntoSections(text: string): string[] {
  const sections: string[] = [];
  
  // Try to identify section headings (all caps, numbered sections, etc.)
  const headingPatterns = [
    /\n\s*[IVX]+\.\s+[A-Z][A-Z\s]+\n/g, // Roman numeral headings (I. INTRODUCTION)
    /\n\s*\d+\.\d*\s+[A-Z][A-Za-z\s]+\n/g, // Numbered sections (1.1 Section Title)
    /\n\s*[A-Z][A-Z\s]{2,}[A-Z]\n/g, // ALL CAPS headings (INTRODUCTION)
    /\n\s*[A-Z][a-z]+\s+\d+[\.:](?:\s+[A-Z]|\s*\n)/g, // Section X: or Section X. patterns
  ];
  
  // Find potential splitting points
  let splitPoints: number[] = [0]; // Always include the start
  
  for (const pattern of headingPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      splitPoints.push(match.index);
    }
  }
  
  // Sort split points and remove duplicates
  splitPoints = Array.from(new Set(splitPoints)).sort((a, b) => a - b);
  
  // Add the end of text as the final split point
  splitPoints.push(text.length);
  
  // Create sections based on split points
  for (let i = 0; i < splitPoints.length - 1; i++) {
    const section = text.substring(splitPoints[i], splitPoints[i + 1]).trim();
    
    // Only add non-empty sections
    if (section.length > 50) { // Minimum section length to be meaningful
      sections.push(section);
    }
  }
  
  // If we failed to find logical sections, fall back to simple chunking
  if (sections.length <= 1) {
    // Simple paragraph-based chunking as fallback
    const paragraphs = text.split(/\n\s*\n/);
    
    // Group paragraphs into reasonably sized sections
    let currentSection = '';
    for (const paragraph of paragraphs) {
      // If adding this paragraph would make the section too large, start a new one
      if (currentSection.length + paragraph.length > 6000) {
        if (currentSection.length > 0) {
          sections.push(currentSection);
          currentSection = '';
        }
      }
      
      currentSection += (currentSection ? '\n\n' : '') + paragraph;
    }
    
    // Add the last section if it's not empty
    if (currentSection.length > 0) {
      sections.push(currentSection);
    }
  }
  
  console.log(`Split PDF into ${sections.length} logical sections`);
  return sections;
}

/**
 * Process a PDF file to extract requirements
 * @param filePath Path to the PDF file
 * @param projectName Name of the project
 * @param fileName Name of the file
 * @param contentType Type of content in the file
 * @param reqPerChunk Number of requirements to extract per chunk
 * @returns Array of requirements
 */
export async function processPdfFile(
  filePath: string,
  projectName: string,
  fileName: string,
  contentType: string = 'documentation',
  reqPerChunk: number = 5
): Promise<any[]> {
  try {
    console.log(`Processing PDF file: ${fileName}`);
    
    // Extract text from PDF
    const pdfText = await extractTextFromPdf(filePath);
    
    // Calculate document size for logging
    const fileSizeKB = Buffer.byteLength(pdfText, 'utf8') / 1024;
    console.log(`PDF text content: ${fileSizeKB.toFixed(2)} KB`);
    
    // Split into logical sections based on document structure
    const sections = splitPdfIntoSections(pdfText);
    console.log(`Identified ${sections.length} logical sections in PDF`);
    
    // Process each section to extract requirements
    // Use the existing processTextFile function but feed it content directly
    // This avoids temp file creation and provides better context
    
    // Create a temporary file for each section
    let allRequirements: any[] = [];
    
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      console.log(`Processing PDF section ${i+1}/${sections.length} (${section.length} chars)`);
      
      try {
        // Process this section directly
        // Create a temp file with this section
        const tempFilePath = `${filePath}.section-${i+1}.tmp`;
        fs.writeFileSync(tempFilePath, section);
        
        // Process the section using our existing text processor
        // Include section number in file name for better context
        const sectionRequirements = await processTextFile(
          tempFilePath,
          projectName,
          `${fileName} (Section ${i+1}/${sections.length})`,
          contentType,
          reqPerChunk
        );
        
        allRequirements = [...allRequirements, ...sectionRequirements];
        
        // Clean up temp file
        fs.unlinkSync(tempFilePath);
        
        console.log(`Extracted ${sectionRequirements.length} requirements from section ${i+1}`);
      } catch (sectionError) {
        console.error(`Error processing section ${i+1}:`, sectionError);
        // Continue with other sections even if one fails
      }
      
      // Small pause between sections to avoid rate limiting
      if (i < sections.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // Remove any duplicate requirements
    const uniqueRequirements = allRequirements.filter((req, index, self) =>
      index === self.findIndex((r) => r.text === req.text)
    );
    
    console.log(`PDF processing complete: ${uniqueRequirements.length} unique requirements extracted`);
    return uniqueRequirements;
  } catch (error) {
    console.error("Error processing PDF file:", error);
    throw error;
  }
}