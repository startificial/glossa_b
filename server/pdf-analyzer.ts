import { promises as fs } from 'fs';
import path from 'path';
import pdf from 'pdf-parse';
import tesseract from 'node-tesseract-ocr';

// Skip pdfjs for now since we're having compatibility issues
// We'll rely entirely on pdf-parse and OCR methods instead

/**
 * Cleans PDF text by removing excessive whitespace, formatting characters and common PDF artifacts
 * @param text Raw text extracted from PDF
 * @returns Cleaned text
 */
function cleanPdfText(text: string): string {
  // Handle null or undefined
  if (!text) return '';
  
  // Replace form feeds with newlines
  let cleanedText = text.replace(/\f/g, '\n');
  
  // Normalize line endings
  cleanedText = cleanedText.replace(/(\r\n|\r)/g, '\n');
  
  // Convert multiple spaces to a single space
  cleanedText = cleanedText.replace(/ {2,}/g, ' ');
  
  // Remove non-printable and control characters
  cleanedText = cleanedText.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
  
  // Normalize multiple newlines to max 2
  cleanedText = cleanedText.replace(/\n{3,}/g, '\n\n');
  
  // Trim leading/trailing whitespace
  cleanedText = cleanedText.trim();
  
  return cleanedText;
}

/**
 * Advanced text extraction from PDF using multiple methods including OCR
 * @param filePath Path to the PDF file
 * @returns Object containing the extracted text and info about methods used
 */
export async function advancedExtractTextFromPdf(filePath: string): Promise<{
  text: string;
  byPage: string[];
  methodsUsed: string[];
  hasOcrText: boolean;
  pageCount: number;
}> {
  console.log(`Advanced PDF processing: ${filePath}`);
  
  // Initialize result object
  const result = {
    text: '',
    byPage: [] as string[],
    methodsUsed: [] as string[],
    hasOcrText: false,
    pageCount: 0
  };
  
  try {
    // 1. First try the standard pdf-parse method
    const dataBuffer = await fs.readFile(filePath);
    let pdfData;
    
    try {
      pdfData = await pdf(dataBuffer);
      if (pdfData && pdfData.text && pdfData.text.trim().length > 0) {
        result.text = cleanPdfText(pdfData.text);
        result.methodsUsed.push('pdf-parse');
        result.pageCount = pdfData.numpages || 0;
      }
    } catch (error: any) {
      console.warn("Standard PDF parsing failed:", error?.message || "Unknown error");
    }
    
    // Skip PDF.js implementation due to compatibility issues
    // We'll use OCR directly as a fallback for pdf-parse
    
    // 3. If we still have very little text, try OCR on the first page to detect if this is a scanned document
    const totalCharacters = result.text.length;
    if (totalCharacters < 200 && result.pageCount > 0) {
      console.log(`PDF contains minimal text (${totalCharacters} chars in ${result.pageCount} pages). Checking if scanned document...`);
      
      // Apply OCR on the PDF content
      try {
        // Create a configuration for Tesseract OCR
        const config = {
          lang: "eng",
          oem: 1,
          psm: 3,
        };
        
        // First, attempt to run OCR on the PDF to see if we get better results
        const tempOutput = await tesseract.recognize(filePath, config);
        
        if (tempOutput && tempOutput.length > totalCharacters * 2) {
          console.log(`OCR found significant text (${tempOutput.length} chars vs ${totalCharacters} chars). PDF appears to be scanned/image-based.`);
          result.hasOcrText = true;
          result.methodsUsed.push('tesseract-ocr');
          
          // Since OCR worked well, store the OCR text
          result.text = cleanPdfText(tempOutput);
        }
      } catch (ocrError: any) {
        console.warn("OCR processing failed:", ocrError?.message || "Unknown OCR error");
      }
    }
    
    console.log(`PDF extraction complete: ${result.text.length} chars extracted using ${result.methodsUsed.join(', ')}`);
    console.log(`OCR detection: ${result.hasOcrText ? 'Document appears to be scanned/image-based' : 'Document has native text'}`);
    
    return result;
  } catch (error: any) {
    console.error('Failed in advanced PDF extraction:', error?.message || 'Unknown error');
    return {
      text: '',
      byPage: [],
      methodsUsed: ['failed'],
      hasOcrText: false,
      pageCount: 0
    };
  }
}

/**
 * Extract metadata from a PDF file
 * @param filePath Path to the PDF file
 * @returns Extracted metadata as text
 */
export async function extractPdfMetadata(filePath: string): Promise<string> {
  try {
    const dataBuffer = await fs.readFile(filePath);
    const pdfData = await pdf(dataBuffer);
    
    if (!pdfData || !pdfData.info) {
      return '';
    }
    
    const metadata = pdfData.info;
    let metadataText = '';
    
    // Extract and format all available metadata
    if (metadata.Title) metadataText += `Title: ${metadata.Title}\n`;
    if (metadata.Author) metadataText += `Author: ${metadata.Author}\n`;
    if (metadata.Subject) metadataText += `Subject: ${metadata.Subject}\n`;
    if (metadata.Keywords) metadataText += `Keywords: ${metadata.Keywords}\n`;
    if (metadata.Creator) metadataText += `Creator: ${metadata.Creator}\n`;
    if (metadata.Producer) metadataText += `Producer: ${metadata.Producer}\n`;
    if (metadata.CreationDate) {
      try {
        const date = new Date(metadata.CreationDate);
        metadataText += `Creation Date: ${date.toISOString().split('T')[0]}\n`;
      } catch (e) {
        metadataText += `Creation Date: ${metadata.CreationDate}\n`;
      }
    }
    
    return metadataText;
  } catch (error: any) {
    console.warn('Failed to extract PDF metadata:', error?.message || 'Unknown error');
    return '';
  }
}

/**
 * Analyze a PDF file to infer its context and domain
 * @param textContent The extracted text content from the PDF
 * @param fileName The name of the PDF file
 * @returns Object with inferred context information
 */
export function inferPdfContext(textContent: string, fileName: string): {
  domain: string;
  docType: string;
  keywords: string[];
  hasRequirements: boolean;
} {
  // Default result with properly typed keywords array
  const result: {
    domain: string;
    docType: string;
    keywords: string[];
    hasRequirements: boolean;
  } = {
    domain: 'general',
    docType: 'document',
    keywords: [],
    hasRequirements: false
  };
  
  // Extract keywords from filename
  const fileNameWords = fileName.toLowerCase()
    .replace(/\.[^.]+$/, '') // Remove file extension
    .replace(/[_\-\d.]/g, ' ') // Replace separators with spaces
    .split(/\s+/)
    .filter(word => word.length > 3); // Only keep words longer than 3 chars
  
  // Common document type indicators in filenames
  const docTypeMap: Record<string, string> = {
    'requirement': 'requirements',
    'spec': 'specification',
    'sow': 'statement of work',
    'rfp': 'request for proposal',
    'proposal': 'proposal',
    'design': 'design document',
    'architecture': 'architecture document',
    'plan': 'project plan',
    'schedule': 'schedule',
    'contract': 'contract',
    'agreement': 'agreement',
    'manual': 'manual',
    'guide': 'guide',
    'instructions': 'instructions',
    'report': 'report'
  };
  
  // Check filename for document type indicators
  for (const [keyword, docType] of Object.entries(docTypeMap)) {
    if (fileName.toLowerCase().includes(keyword)) {
      result.docType = docType;
      break;
    }
  }
  
  // Domain detection keywords
  const domainKeywords: Record<string, string[]> = {
    'software': ['software', 'application', 'system', 'code', 'programming', 'development', 'api', 'interface', 'platform'],
    'web': ['website', 'web', 'online', 'internet', 'browser', 'frontend', 'backend', 'responsive'],
    'mobile': ['mobile', 'app', 'android', 'ios', 'smartphone', 'tablet'],
    'database': ['database', 'data', 'storage', 'sql', 'nosql', 'migration'],
    'cloud': ['cloud', 'aws', 'azure', 'gcp', 'hosting', 'saas', 'iaas', 'paas'],
    'security': ['security', 'authentication', 'authorization', 'encryption', 'firewall', 'compliance'],
    'networking': ['network', 'infrastructure', 'router', 'switch', 'vpn', 'connectivity'],
    'enterprise': ['enterprise', 'business', 'corporate', 'organization', 'company'],
    'healthcare': ['health', 'medical', 'patient', 'clinic', 'hospital', 'healthcare', 'hipaa'],
    'financial': ['financial', 'banking', 'payment', 'transaction', 'finance', 'accounting'],
    'education': ['education', 'learning', 'school', 'academic', 'student', 'course'],
    'ecommerce': ['ecommerce', 'retail', 'store', 'shopping', 'checkout', 'cart', 'product'],
    'crm': ['crm', 'customer', 'salesforce', 'relationship', 'contact', 'lead'],
    'erp': ['erp', 'enterprise resource', 'sap', 'oracle', 'inventory', 'supply chain'],
    'ai': ['ai', 'artificial intelligence', 'machine learning', 'ml', 'neural', 'model']
  };
  
  // Combine filename and first part of content for better domain detection
  const contentSample = textContent.slice(0, 3000).toLowerCase();
  const combinedText = fileNameWords.join(' ') + ' ' + contentSample;
  
  // Count domain keyword occurrences
  const domainScores: Record<string, number> = {};
  
  for (const [domain, keywords] of Object.entries(domainKeywords)) {
    domainScores[domain] = 0;
    for (const keyword of keywords) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      const matches = combinedText.match(regex);
      if (matches) {
        domainScores[domain] += matches.length;
      }
    }
  }
  
  // Find domain with highest score
  let highestScore = 0;
  for (const [domain, score] of Object.entries(domainScores)) {
    if (score > highestScore) {
      highestScore = score;
      result.domain = domain;
    }
  }
  
  // Build keyword list
  const keywordCandidates = new Set<string>();
  
  // Add domain-specific keywords that appear in the text
  const domainSpecificKeywords = domainKeywords[result.domain] || [];
  for (const keyword of domainSpecificKeywords) {
    if (combinedText.includes(keyword)) {
      keywordCandidates.add(keyword);
    }
  }
  
  // Add filename words as keywords
  for (const word of fileNameWords) {
    keywordCandidates.add(word);
  }
  
  // Convert to array and limit to top 5 keywords
  result.keywords = Array.from(keywordCandidates).slice(0, 5) as string[];
  
  // Check if document likely contains requirements
  const requirementIndicators = [
    'must', 'shall', 'should', 'will', 'requirement', 'requirements', 
    'functional', 'non-functional', 'user story', 'user stories', 'acceptance criteria'
  ];
  
  result.hasRequirements = requirementIndicators.some(indicator => 
    combinedText.includes(indicator)
  );
  
  return result;
}

/**
 * Comprehensive PDF analysis that extracts text, metadata, and infers context
 * @param filePath Path to the PDF file
 * @returns Complete analysis of the PDF
 */
export async function analyzePdf(filePath: string): Promise<{
  text: string;
  metadata: string;
  context: {
    domain: string;
    docType: string;
    keywords: string[];
    hasRequirements: boolean;
  };
  hasOcrText: boolean;
  pageCount: number;
  isScanOrImage: boolean;
}> {
  try {
    console.log(`Analyzing PDF: ${filePath}`);
    
    // Extract text and info about the extraction process
    const extractionResult = await advancedExtractTextFromPdf(filePath);
    
    // Extract metadata from the PDF
    const metadata = await extractPdfMetadata(filePath);
    
    // Get the filename without path
    const fileName = path.basename(filePath);
    
    // Infer context from text content and filename
    const context = inferPdfContext(extractionResult.text, fileName);
    
    // Determine if this is a scanned document or has very little text per page
    const isScannedOrImage = extractionResult.hasOcrText || 
      (extractionResult.text.length < 200 && extractionResult.pageCount > 0) ||
      (extractionResult.text.length / Math.max(1, extractionResult.pageCount) < 50);
    
    if (isScannedOrImage) {
      console.log(`PDF appears to be a scanned or image-based document with minimal extractable text`);
    }
    
    return {
      text: extractionResult.text,
      metadata,
      context,
      hasOcrText: extractionResult.hasOcrText,
      pageCount: extractionResult.pageCount,
      isScanOrImage: isScannedOrImage
    };
  } catch (error: any) {
    console.error(`Error analyzing PDF: ${error?.message || 'Unknown error'}`);
    return {
      text: '',
      metadata: '',
      context: {
        domain: 'general',
        docType: 'document',
        keywords: [],
        hasRequirements: false
      },
      hasOcrText: false,
      pageCount: 0,
      isScanOrImage: false
    };
  }
}