import fs from 'fs';
import util from 'util';
import pdfParse from 'pdf-parse';
import { processTextFile } from './gemini';
import os from 'os';

// Use promisified versions of fs functions
const readFile = util.promisify(fs.readFile);

// Default PDF size limit (in bytes)
const PDF_SIZE_LIMIT = 100 * 1024 * 1024; // 100MB soft cap

/**
 * Validates PDF file before processing
 * @param filePath Path to the PDF file
 * @param allowLargeFiles Whether to bypass the size limit
 * @returns Object containing validation result and message if failed
 */
export async function validatePdf(filePath: string, allowLargeFiles: boolean = false): Promise<{valid: boolean, message?: string}> {
  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return { valid: false, message: "PDF file not found" };
    }
    
    // Check file size
    const stats = fs.statSync(filePath);
    if (stats.size > PDF_SIZE_LIMIT && !allowLargeFiles) {
      return { 
        valid: false, 
        message: `PDF exceeds size limit of ${PDF_SIZE_LIMIT / (1024 * 1024)}MB. Use large-file mode to process it.` 
      };
    }
    
    // Do a quick check if the file is actually a PDF
    const magicBytes = Buffer.alloc(5);
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, magicBytes, 0, 5, 0);
    fs.closeSync(fd);
    
    if (magicBytes.toString('utf8') !== '%PDF-') {
      return { valid: false, message: "Not a valid PDF file" };
    }
    
    return { valid: true };
  } catch (error) {
    console.error("Error validating PDF:", error);
    return { valid: false, message: `PDF validation error: ${error}` };
  }
}

/**
 * Cleans PDF text by removing excessive whitespace, formatting characters and common PDF artifacts
 * @param text Raw text extracted from PDF
 * @returns Cleaned text
 */
function cleanPdfText(text: string): string {
  // Step 1: Basic cleanup and normalization
  // Replace multiple newlines with a single one
  text = text.replace(/\n{3,}/g, '\n\n');
  
  // Remove PDF artifacts and common formatting issues
  text = text.replace(/\f/g, '\n'); // Form feed
  text = text.replace(/(\r\n|\r)/g, '\n'); // Normalize line endings
  
  // Remove repeated spaces
  text = text.replace(/ {2,}/g, ' ');
  
  // Remove strange unicode control characters
  text = text.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
  
  // Step 2: Fix common punctuation issues
  // Replace common PDF extraction artifacts
  text = text.replace(/([A-Za-z]),([A-Za-z])/g, '$1, $2'); // Add space after commas
  text = text.replace(/\.([A-Z])/g, '. $1'); // Add space after periods
  text = text.replace(/([a-z]):([a-zA-Z])/g, '$1: $2'); // Add space after colons
  text = text.replace(/([a-z]);([a-zA-Z])/g, '$1; $2'); // Add space after semicolons
  
  // Step 3: Handle headers, footers, page numbers
  // Remove page numbers and headers/footers patterns
  text = text.replace(/\n\s*\d+\s*\n/g, '\n'); // Isolated page numbers
  text = text.replace(/\n.*Page \d+ of \d+.*/gi, ''); // Page X of Y patterns
  text = text.replace(/\n\s*\d+\s*$/gm, ''); // Page numbers at end of lines
  text = text.replace(/^\s*\d+\s*\n/gm, ''); // Page numbers at start of lines
  
  // Common footer patterns like dates, document IDs, etc.
  text = text.replace(/\n.*Confidential.*/gi, '');
  text = text.replace(/\n.*Copyright.*/gi, '');
  text = text.replace(/\n.*All rights reserved.*/gi, '');
  text = text.replace(/\n.*Document ID:.*/gi, '');
  text = text.replace(/\n.*Prepared by:.*/gi, '');
  text = text.replace(/\n.*Last updated:.*/gi, '');
  text = text.replace(/\n.*Draft.*/gi, '');
  
  // Step 4: Format lists and bullets
  // Fix bullets and lists which can get mangled in PDFs
  text = text.replace(/\n[•·\-–—] */g, '\n• ');
  text = text.replace(/\n\s*(\d+)[\.)\]]\s*/g, '\n$1. '); // Numbered lists (1. or 1) or 1])
  
  // Step 5: Handle paragraph continuations
  // Join paragraphs split across lines inappropriately
  text = text.replace(/([a-z,;:])(?:\s*\n\s*)([a-z])/g, '$1 $2');
  
  // Handle sentences split across lines
  text = text.replace(/([^.!?:;])\n([a-z])/g, '$1 $2');
  
  // Step 6: Final cleanup
  // Remove excessive spacing at the beginning of lines
  text = text.replace(/\n\s+/g, '\n');
  
  // Remove excessive spacing at the end of lines
  text = text.replace(/\s+\n/g, '\n');
  
  // Remove duplicate blank lines
  text = text.replace(/\n\n+/g, '\n\n');
  
  // Remove watermark text (often found in PDFs)
  text = text.replace(/DRAFT|CONFIDENTIAL|INTERNAL USE ONLY|DO NOT DISTRIBUTE/gi, '');
  
  // Remove common OCR artifacts
  text = text.replace(/[^\x00-\x7F]+\s*Scanned by.*/g, '');
  text = text.replace(/Digitally signed by.*/g, '');
  
  return text.trim();
}

/**
 * Extract text content from a PDF file with better cleaning and structure preservation
 * @param filePath Path to the PDF file
 * @returns Cleaned text extracted from the PDF
 */
export async function extractTextFromPdf(filePath: string): Promise<string> {
  try {
    // First, validate the PDF
    const validation = await validatePdf(filePath);
    if (!validation.valid) {
      throw new Error(`PDF validation failed: ${validation.message}`);
    }
    
    // Read the PDF file
    const dataBuffer = await readFile(filePath);
    
    // Configure options for pdf-parse to handle potential errors
    const options = {
      // Number of pages to extract. Default is -1 (all pages)
      max: -1,
      
      // Handle password-protected PDFs
      password: '',
      
      // Custom render callback to handle potential errors on a page-by-page basis
      pagerender: async (pageData: any) => {
        try {
          // This is the default rendering which extracts text
          const render_options = {
            normalizeWhitespace: true,
            disableCombineTextItems: false
          };
          return await pageData.getTextContent(render_options);
        } catch (error: any) {
          const pageError = error as Error;
          console.warn(`Warning: Error rendering page ${pageData.pageIndex + 1}: ${pageError.message}`);
          // Return empty content for this page rather than failing the whole process
          return { items: [] };
        }
      }
    };
    
    try {
      // Try to parse the entire PDF at once
      const pdfData = await pdfParse(dataBuffer, options);
      
      // Clean the extracted text
      const cleanedText = cleanPdfText(pdfData.text);
      
      console.log(`PDF processed: ${filePath}`);
      console.log(`Extracted ${cleanedText.length} characters of text from ${pdfData.numpages} pages`);
      
      return cleanedText;
    } catch (error: any) {
      const parseError = error as Error;
      // If parsing the entire PDF fails, try a page-by-page approach
      console.warn(`Warning: Error parsing entire PDF, trying page-by-page approach: ${parseError.message}`);
      
      // Fallback to page-by-page extraction if the whole document fails
      return extractTextPageByPage(filePath);
    }
  } catch (error) {
    console.error(`Error extracting text from PDF: ${error}`);
    throw new Error(`Failed to extract text from PDF: ${error}`);
  }
}

/**
 * Extract text from PDF page by page as a fallback method
 * @param filePath Path to the PDF file
 * @returns Concatenated and cleaned text from all successfully parsed pages
 */
async function extractTextPageByPage(filePath: string): Promise<string> {
  try {
    // Read the PDF file
    const dataBuffer = await readFile(filePath);
    
    // First, get the number of pages without extracting content
    // This is a lightweight operation
    const data = await pdfParse(dataBuffer, { max: 1, text: false });
    const numPages = data.numpages;
    
    console.log(`Attempting page-by-page extraction for PDF with ${numPages} pages`);
    
    let allText = '';
    let successfulPages = 0;
    
    // Process each page individually
    for (let i = 1; i <= numPages; i++) {
      try {
        // Extract just this page
        const pageData = await pdfParse(dataBuffer, { 
          max: 1, 
          page: i 
        });
        
        if (pageData && pageData.text) {
          allText += pageData.text + '\n\n';
          successfulPages++;
        }
      } catch (error: any) {
        console.warn(`Warning: Could not extract page ${i}: ${error.message || String(error)}`);
        // Continue with the next page
      }
      
      // Add a page separator for debugging (can be removed later)
      if (i < numPages) {
        allText += '--- Page Break ---\n\n';
      }
    }
    
    console.log(`Successfully extracted text from ${successfulPages} out of ${numPages} pages`);
    
    // Clean the concatenated text
    const cleanedText = cleanPdfText(allText);
    
    return cleanedText;
  } catch (error) {
    console.error(`Error in page-by-page extraction: ${error}`);
    throw new Error(`Failed in page-by-page PDF extraction: ${error}`);
  }
}

/**
 * Estimates the approximate word count for a text
 * @param text Text to analyze
 * @returns Approximate word count
 */
function estimateWordCount(text: string): number {
  // Simple heuristic: count spaces and add 1
  const spaceCount = (text.match(/ /g) || []).length;
  return spaceCount + 1;
}

/**
 * Analyzes PDF content to determine optimal chunking strategy
 * @param text Full PDF text
 * @returns Chunking parameters
 */
function analyzeChunkingStrategy(text: string): {
  targetWordsPerChunk: number, 
  overlapWords: number,
  chunkMethod: 'page' | 'semantic' | 'adaptive'
} {
  const totalWords = estimateWordCount(text);
  const totalLength = text.length;
  
  // Calculate text density (chars per word)
  const charsPerWord = totalLength / totalWords;
  
  // Determine appropriate chunking strategy based on content metrics
  if (totalWords < 2000) {
    // Very small documents can use a larger chunk size
    return {
      targetWordsPerChunk: totalWords, // Just one chunk
      overlapWords: 0,
      chunkMethod: 'semantic'
    };
  } else if (charsPerWord < 4.5) {
    // Low character per word ratio suggests dense technical content
    // Use smaller chunks with more overlap
    return {
      targetWordsPerChunk: 1000,
      overlapWords: 150,
      chunkMethod: 'semantic'
    };
  } else if (charsPerWord > 7) {
    // High character per word ratio might be code or non-English content
    // Use adaptive chunking
    return {
      targetWordsPerChunk: 800,
      overlapWords: 200,
      chunkMethod: 'adaptive'
    };
  } else {
    // Default for normal content
    return {
      targetWordsPerChunk: 1500, 
      overlapWords: 100,
      chunkMethod: 'semantic'
    };
  }
}

/**
 * Split PDF text into logical sections based on headings and structure
 * @param text PDF text content
 * @param chunkStrategy Optional chunking strategy parameters
 * @returns Array of text sections
 */
function splitPdfIntoSections(text: string, chunkStrategy?: { 
  targetWordsPerChunk: number, 
  overlapWords: number,
  chunkMethod: 'page' | 'semantic' | 'adaptive'
}): string[] {
  // If no strategy provided, analyze the text to determine optimal strategy
  if (!chunkStrategy) {
    chunkStrategy = analyzeChunkingStrategy(text);
  }
  
  const sections: string[] = [];
  console.log(`Using ${chunkStrategy.chunkMethod} chunking with target of ${chunkStrategy.targetWordsPerChunk} words per chunk and ${chunkStrategy.overlapWords} word overlap`);
  
  // For semantic chunking, try to find logical break points
  if (chunkStrategy.chunkMethod === 'semantic') {
    // Try to identify section headings (all caps, numbered sections, etc.)
    const headingPatterns = [
      /\n\s*[IVX]+\.\s+[A-Z][A-Z\s]+\n/g, // Roman numeral headings (I. INTRODUCTION)
      /\n\s*\d+\.\d*\s+[A-Z][A-Za-z\s]+\n/g, // Numbered sections (1.1 Section Title)
      /\n\s*[A-Z][A-Z\s]{2,}[A-Z]\n/g, // ALL CAPS headings (INTRODUCTION)
      /\n\s*[A-Z][a-z]+\s+\d+[\.:](?:\s+[A-Z]|\s*\n)/g, // Section X: or Section X. patterns
      /\n\s*#+\s+[A-Z].*\n/g, // Markdown-style headers (# Header)
      /\n\s*={3,}\s*\n/g, // Separator lines ====
      /\n\s*-{3,}\s*\n/g, // Separator lines ----
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
    
      // Only add non-empty sections that have meaningful content
      if (section.length > 50) { // Minimum section length to be meaningful
        sections.push(section);
      }
    }
  }
  
  // If semantic chunking found reasonable sections, process them for size
  // Or if we're using adaptive chunking, take these sections and adjust them further
  if (sections.length > 1 || chunkStrategy.chunkMethod === 'adaptive') {
    const processedSections: string[] = [];
    
    // Process each semantic section to ensure it meets size targets
    for (const section of sections) {
      // If section is too large, split it further
      if (estimateWordCount(section) > chunkStrategy.targetWordsPerChunk * 1.5) {
        // Split into paragraphs
        const paragraphs = section.split(/\n\s*\n/);
        
        let currentChunk = '';
        let currentWordCount = 0;
        let chunk: string[] = [];
        
        // Build chunks from paragraphs
        for (const paragraph of paragraphs) {
          const paragraphWordCount = estimateWordCount(paragraph);
          
          // If adding this paragraph would exceed the target, start a new chunk
          if (currentWordCount + paragraphWordCount > chunkStrategy.targetWordsPerChunk) {
            // If we have accumulated content, add it as a chunk
            if (currentChunk) {
              processedSections.push(currentChunk);
            }
            
            // Start a new chunk
            // If adding overlap, include some of the previous chunk
            if (chunkStrategy.overlapWords > 0 && chunk.length > 0) {
              // Take some paragraphs from the end of the previous chunk
              let overlapText = '';
              let overlapWordCount = 0;
              
              for (let i = chunk.length - 1; i >= 0; i--) {
                const prevParagraph = chunk[i];
                const prevWordCount = estimateWordCount(prevParagraph);
                
                if (overlapWordCount + prevWordCount <= chunkStrategy.overlapWords) {
                  overlapText = prevParagraph + (overlapText ? '\n\n' + overlapText : '');
                  overlapWordCount += prevWordCount;
                } else {
                  break;
                }
              }
              
              currentChunk = overlapText;
              currentWordCount = overlapWordCount;
            } else {
              currentChunk = '';
              currentWordCount = 0;
            }
            
            chunk = [];
          }
          
          // Add paragraph to the current chunk
          currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
          currentWordCount += paragraphWordCount;
          chunk.push(paragraph);
        }
        
        // Don't forget the last chunk
        if (currentChunk) {
          processedSections.push(currentChunk);
        }
      } else {
        // Section is already the right size, keep it as is
        processedSections.push(section);
      }
    }
    
    console.log(`Refined chunking: ${sections.length} semantic sections into ${processedSections.length} processed chunks`);
    return processedSections;
  }
  
  // If we failed to find logical sections or we specifically want page-based chunking
  if (sections.length <= 1 || chunkStrategy.chunkMethod === 'page') {
    console.log('Using paragraph-based chunking as fallback');
    
    // Reset sections array if we failed to find semantic sections
    const processedSections: string[] = [];
    
    // Simple paragraph-based chunking as fallback
    const paragraphs = text.split(/\n\s*\n/);
    
    // Group paragraphs into reasonably sized chunks
    let currentChunk = '';
    let currentWordCount = 0;
    let chunk: string[] = [];
    
    for (const paragraph of paragraphs) {
      const paragraphWordCount = estimateWordCount(paragraph);
      
      // If adding this paragraph would exceed the target size, start a new chunk
      if (currentWordCount + paragraphWordCount > chunkStrategy.targetWordsPerChunk) {
        if (currentChunk) {
          processedSections.push(currentChunk);
        }
        
        // Start a new chunk with overlap
        if (chunkStrategy.overlapWords > 0 && chunk.length > 0) {
          // Take some paragraphs from the end of the previous chunk
          let overlapText = '';
          let overlapWordCount = 0;
          
          for (let i = chunk.length - 1; i >= 0; i--) {
            const prevParagraph = chunk[i];
            const prevWordCount = estimateWordCount(prevParagraph);
            
            if (overlapWordCount + prevWordCount <= chunkStrategy.overlapWords) {
              overlapText = prevParagraph + (overlapText ? '\n\n' + overlapText : '');
              overlapWordCount += prevWordCount;
            } else {
              break;
            }
          }
          
          currentChunk = overlapText;
          currentWordCount = overlapWordCount;
        } else {
          currentChunk = '';
          currentWordCount = 0;
        }
        
        chunk = [];
      }
      
      // Add paragraph to current chunk
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
      currentWordCount += paragraphWordCount;
      chunk.push(paragraph);
    }
    
    // Don't forget the last chunk
    if (currentChunk) {
      processedSections.push(currentChunk);
    }
    
    console.log(`Created ${processedSections.length} chunks from paragraphs using target of ${chunkStrategy.targetWordsPerChunk} words`);
    return processedSections;
  }
  
  return sections;
}

/**
 * Process a PDF file to extract requirements using memory-efficient methods
 * @param filePath Path to the PDF file
 * @param projectName Name of the project
 * @param fileName Name of the file
 * @param contentType Type of content in the file
 * @param reqPerChunk Number of requirements to extract per chunk
 * @param allowLargeFiles Whether to bypass the size limit for large files
 * @param inputDataId The ID of the input data (for text references)
 * @returns Array of requirements
 */
export async function processPdfFile(
  filePath: string,
  projectName: string,
  fileName: string,
  contentType: string = 'documentation',
  reqPerChunk: number = 5,
  allowLargeFiles: boolean = false,
  inputDataId?: number
): Promise<any[]> {
  try {
    console.log(`Processing PDF file: ${fileName}`);
    
    // First validate the PDF file
    const validation = await validatePdf(filePath, allowLargeFiles);
    if (!validation.valid) {
      throw new Error(`PDF validation failed: ${validation.message}`);
    }
    
    // Extract text from PDF using optimized methods
    const pdfText = await extractTextFromPdf(filePath);
    
    // Calculate document size for logging
    const fileSizeKB = Buffer.byteLength(pdfText, 'utf8') / 1024;
    console.log(`PDF text content: ${fileSizeKB.toFixed(2)} KB`);
    
    // Choose optimal chunking strategy based on content analysis
    const chunkStrategy = analyzeChunkingStrategy(pdfText);
    
    // Split into logical sections based on document structure and chosen strategy
    const sections = splitPdfIntoSections(pdfText, chunkStrategy);
    console.log(`Identified ${sections.length} logical sections in PDF using ${chunkStrategy.chunkMethod} chunking`);
    
    // Process each section to extract requirements - use memory-efficient approach
    // Create a temporary file for each section but process them in batches
    // to avoid excessive memory usage
    
    let allRequirements: any[] = [];
    
    // Track memory usage to avoid memory leaks
    const getMemoryUsageMB = () => {
      const memUsage = process.memoryUsage();
      return {
        rss: Math.round(memUsage.rss / 1024 / 1024),
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        external: Math.round(memUsage.external / 1024 / 1024),
      };
    };
    
    console.log(`Memory before processing: ${JSON.stringify(getMemoryUsageMB())} MB`);
    
    // Set batch size based on available system memory and section count
    const totalSystemMemoryMB = Math.round(os.totalmem() / 1024 / 1024);
    const freeSystemMemoryMB = Math.round(os.freemem() / 1024 / 1024);
    console.log(`System memory: ${freeSystemMemoryMB}MB free of ${totalSystemMemoryMB}MB total`);
    
    // Adjust batch size based on available memory and content size
    const BATCH_SIZE = freeSystemMemoryMB < 2048 ? 1 : 
                      freeSystemMemoryMB < 4096 ? 2 : 3; // Process fewer sections at a time if memory is limited
    
    for (let batchStart = 0; batchStart < sections.length; batchStart += BATCH_SIZE) {
      const batchEnd = Math.min(batchStart + BATCH_SIZE, sections.length);
      console.log(`Processing batch of sections ${batchStart+1}-${batchEnd} of ${sections.length}`);
      
      // Process this batch of sections
      const batchPromises: Promise<any[]>[] = [];
      const tempFilePaths: string[] = [];
      
      // Prepare all sections in this batch
      for (let i = batchStart; i < batchEnd; i++) {
        const section = sections[i];
        console.log(`Preparing PDF section ${i+1}/${sections.length} (${section.length} chars)`);
        
        // Create a temp file with this section - use a unique name to avoid collisions
        const tempFilePath = `${filePath}.section-${i+1}-${Date.now()}.tmp`;
        fs.writeFileSync(tempFilePath, section);
        tempFilePaths.push(tempFilePath);
        
        // Create a promise to process this section
        const sectionPromise = processTextFile(
          tempFilePath,
          projectName,
          `${fileName} (Section ${i+1}/${sections.length})`,
          contentType,
          reqPerChunk,
          inputDataId // Pass input data ID for text references
        ).catch(error => {
          console.error(`Error processing section ${i+1}:`, error);
          return []; // Return empty array if processing fails
        });
        
        batchPromises.push(sectionPromise);
      }
      
      // Wait for all sections in this batch to be processed
      try {
        const batchResults = await Promise.all(batchPromises);
        
        // Add results to overall collection
        for (const sectionRequirements of batchResults) {
          allRequirements = [...allRequirements, ...sectionRequirements];
        }
        
        // Clean up temp files after processing
        for (const tempFilePath of tempFilePaths) {
          try {
            fs.unlinkSync(tempFilePath);
          } catch (error) {
            console.warn(`Warning: Could not delete temp file ${tempFilePath}:`, error);
          }
        }
      } catch (batchError) {
        console.error(`Error processing batch of sections:`, batchError);
        // Continue with other batches even if one fails
      }
      
      // Log memory usage after each batch
      console.log(`Memory after batch processing: ${JSON.stringify(getMemoryUsageMB())} MB`);
      
      // Run garbage collection if supported
      if (global.gc) {
        console.log("Running garbage collection...");
        global.gc();
        console.log(`Memory after garbage collection: ${JSON.stringify(getMemoryUsageMB())} MB`);
      }
      
      // Pause between batches to avoid overwhelming the system
      if (batchEnd < sections.length) {
        console.log(`Pausing between batches...`);
        await new Promise(resolve => setTimeout(resolve, 3000)); // Increased pause time
      }
    }
    
    // Remove any duplicate requirements by comparing text content
    const uniqueRequirements = allRequirements.filter((req, index, self) =>
      index === self.findIndex((r) => r.text === req.text)
    );
    
    // Sort requirements by priority (high, medium, low)
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const sortedRequirements = uniqueRequirements.sort((a, b) => {
      return priorityOrder[a.priority as keyof typeof priorityOrder] - priorityOrder[b.priority as keyof typeof priorityOrder];
    });
    
    // Log memory usage after all processing
    console.log(`Memory after full PDF processing: ${JSON.stringify(getMemoryUsageMB())} MB`);
    
    console.log(`PDF processing complete: ${sortedRequirements.length} unique requirements extracted`);
    return sortedRequirements;
  } catch (error: any) {
    console.error("Error processing PDF file:", error);
    throw new Error(`Failed to process PDF: ${error.message}`);
  }
}