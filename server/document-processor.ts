/**
 * Document Processor Module
 * 
 * This module handles processing of Office documents, primarily DOCX files,
 * converting them to text for further analysis.
 */
import * as mammoth from 'mammoth';
import * as fs from 'fs';
import { logger } from './utils/logger';

interface DocxProcessingResult {
  text: string;
  metadata: any;
  success: boolean;
  error?: string;
}

/**
 * Extracts text from a DOCX file
 * @param filePath Path to the DOCX file
 * @returns Object containing extracted text and metadata
 */
export async function extractTextFromDocx(filePath: string): Promise<DocxProcessingResult> {
  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      logger.error(`DOCX file not found: ${filePath}`);
      return { 
        text: '', 
        metadata: {}, 
        success: false, 
        error: 'File not found'
      };
    }

    // Read the file buffer
    const buffer = fs.readFileSync(filePath);
    
    // Extract text from the document
    const result = await mammoth.extractRawText({ buffer });
    const text = result.value;
    
    // Log any warnings
    if (result.messages && result.messages.length > 0) {
      logger.warn(`Warnings while extracting text from DOCX: ${JSON.stringify(result.messages)}`);
    }
    
    // Return the extracted text with basic metadata
    return {
      text: text || '',
      metadata: {
        docType: 'DOCX document',
        warnings: result.messages
      },
      success: true
    };
  } catch (error) {
    logger.error(`Error extracting text from DOCX file: ${error}`);
    return {
      text: '',
      metadata: {},
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Process a DOCX document and analyze its content
 * @param filePath Path to the DOCX file
 * @returns Object containing extracted text and analysis results
 */
export async function analyzeDocx(filePath: string): Promise<any> {
  try {
    // Extract text from the document
    const extractResult = await extractTextFromDocx(filePath);
    
    if (!extractResult.success || !extractResult.text) {
      return {
        metadata: { error: extractResult.error || 'Failed to extract text from document' },
        context: {
          domain: 'unknown',
          docType: 'DOCX document',
          keywords: [],
          hasRequirements: false
        }
      };
    }
    
    // Basic analysis of the document content
    const text = extractResult.text;
    
    // Simple keyword extraction (could be enhanced with NLP)
    const words = text.toLowerCase().split(/\W+/);
    const wordCounts: Record<string, number> = {};
    
    for (const word of words) {
      if (word.length >= 4) { // Only consider words with 4+ characters
        wordCounts[word] = (wordCounts[word] || 0) + 1;
      }
    }
    
    // Sort words by frequency and get top keywords
    const keywords = Object.entries(wordCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
    
    // Perform basic domain analysis
    const domains = {
      technical: ['software', 'system', 'data', 'api', 'interface', 'server', 'cloud'],
      business: ['business', 'project', 'strategy', 'management', 'customer', 'client', 'revenue'],
      legal: ['legal', 'compliance', 'regulation', 'policy', 'agreement', 'contract', 'law']
    };
    
    // Determine document domain based on keyword presence
    let domain = 'general';
    let maxDomainScore = 0;
    
    for (const [domainName, domainKeywords] of Object.entries(domains)) {
      const score = domainKeywords.reduce((count, keyword) => {
        return count + (text.toLowerCase().includes(keyword) ? 1 : 0);
      }, 0);
      
      if (score > maxDomainScore) {
        maxDomainScore = score;
        domain = domainName;
      }
    }
    
    // Check if the document likely contains requirements
    const requirementsIndicators = [
      'requirement', 'shall', 'must', 'needs to', 'should', 'feature', 
      'user story', 'acceptance criteria', 'specification'
    ];
    
    const hasRequirements = requirementsIndicators.some(indicator => 
      text.toLowerCase().includes(indicator)
    );
    
    return {
      metadata: {
        wordCount: words.length,
        charCount: text.length,
        ...extractResult.metadata
      },
      context: {
        domain,
        docType: 'DOCX document',
        keywords,
        hasRequirements
      }
    };
  } catch (error) {
    logger.error(`Error analyzing DOCX file: ${error}`);
    return {
      metadata: { error: error instanceof Error ? error.message : 'Unknown error' },
      context: {
        domain: 'unknown',
        docType: 'DOCX document',
        keywords: [],
        hasRequirements: false
      }
    };
  }
}