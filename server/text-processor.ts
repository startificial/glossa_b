/**
 * Text processor module for extracting text references for requirements.
 * This allows tying requirements back to specific passages in the text that they were derived from.
 */
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { createHmac } from 'crypto';

/**
 * TextReference type definition
 */
export interface TextReference {
  id: string;
  inputDataId: number;
  startPosition: number;
  endPosition: number;
  text: string;
  contextBefore?: string;
  contextAfter?: string;
  relevance?: number;
}

/**
 * Calculate relevance between a text passage and a requirement
 * @param text The text passage
 * @param requirement The requirement text
 * @returns A score between 0 and 1 representing the relevance
 */
function calculateTextRelevance(text: string, requirement: string): number {
  // Simple word matching algorithm (in a real implementation, use more sophisticated NLP)
  const requirementWords = new Set(
    requirement.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3) // Only consider words longer than 3 chars
  );
  
  const textWords = text.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 3);
  
  if (requirementWords.size === 0 || textWords.length === 0) {
    return 0;
  }
  
  // Count matches
  let matches = 0;
  for (const word of textWords) {
    if (requirementWords.has(word)) {
      matches++;
    }
  }
  
  // Calculate relevance score
  const relevance = matches / Math.min(textWords.length, requirementWords.size);
  return Math.min(1, relevance * 1.5); // Scale a bit
}

/**
 * Find good sentence boundaries in text
 * @param text The full text
 * @param approximatePosition The approximate position to find a boundary near
 * @param searchBackward Whether to search backward (true) or forward (false) from the position
 * @param maxLookup Maximum characters to look up from the position
 * @returns The position of a good sentence boundary
 */
function findSentenceBoundary(
  text: string, 
  approximatePosition: number, 
  searchBackward: boolean = true,
  maxLookup: number = 150
): number {
  // Handle edge cases
  if (approximatePosition <= 0) return 0;
  if (approximatePosition >= text.length) return text.length;
  
  // Determine boundaries for search
  const start = Math.max(0, searchBackward ? approximatePosition - maxLookup : approximatePosition);
  const end = Math.min(text.length, searchBackward ? approximatePosition : approximatePosition + maxLookup);
  
  // Get the text segment to search in
  const segment = text.substring(start, end);
  
  // Find sentence boundaries (periods, exclamation marks, question marks followed by spaces)
  const boundaryRegex = searchBackward 
    ? /[.!?]\s+[A-Z]/g 
    : /[.!?]\s+[A-Z]/g;
  
  let matches = [];
  let match;
  
  // Collect all matches
  while ((match = boundaryRegex.exec(segment)) !== null) {
    const position = start + match.index + 1; // +1 to point after the punctuation
    matches.push(position);
  }
  
  // Find the closest match to the approximate position
  if (matches.length > 0) {
    if (searchBackward) {
      // Get the last match before approximatePosition
      for (let i = matches.length - 1; i >= 0; i--) {
        if (matches[i] <= approximatePosition) {
          return matches[i];
        }
      }
    } else {
      // Get the first match after approximatePosition
      for (let i = 0; i < matches.length; i++) {
        if (matches[i] >= approximatePosition) {
          return matches[i];
        }
      }
    }
  }
  
  // Fallback: if no good sentence boundary found, use paragraph or line breaks
  const breakRegex = searchBackward ? /[\n\r][^\n\r]/g : /[\n\r][^\n\r]/g;
  matches = [];
  
  while ((match = breakRegex.exec(segment)) !== null) {
    const position = start + match.index + 1; // +1 to point after the line break
    matches.push(position);
  }
  
  if (matches.length > 0) {
    if (searchBackward) {
      // Get the last match before approximatePosition
      for (let i = matches.length - 1; i >= 0; i--) {
        if (matches[i] <= approximatePosition) {
          return matches[i];
        }
      }
    } else {
      // Get the first match after approximatePosition
      for (let i = 0; i < matches.length; i++) {
        if (matches[i] >= approximatePosition) {
          return matches[i];
        }
      }
    }
  }
  
  // Last resort: if no good break found, just use the approximate position
  return approximatePosition;
}

/**
 * Process full text content to find relevant passages for a requirement
 * @param text The full text content
 * @param requirement The requirement text to find references for
 * @param inputDataId The ID of the input data
 * @param maxReferences Maximum number of references to return
 * @returns Array of text references
 */
export function findTextReferences(
  text: string, 
  requirement: string, 
  inputDataId: number,
  maxReferences: number = 3
): TextReference[] {
  // Early simplistic approach: check key phrases from the requirement
  const references: TextReference[] = [];
  
  // Extract key phrases (at least 5 words long) from the requirement
  const reqWords = requirement.split(/\s+/);
  const phrases: string[] = [];
  
  // Create key phrases of different lengths to search for
  for (let phraseLength = 5; phraseLength <= 8; phraseLength++) {
    if (reqWords.length >= phraseLength) {
      for (let i = 0; i <= reqWords.length - phraseLength; i += 2) { // Skip every other to reduce overlap
        phrases.push(reqWords.slice(i, i + phraseLength).join(' '));
      }
    }
  }
  
  // Also add some shorter phrases for better matching
  for (let i = 0; i < reqWords.length; i += 3) {
    if (i + 3 <= reqWords.length) {
      phrases.push(reqWords.slice(i, i + 3).join(' '));
    }
  }
  
  // Find these phrases in the text
  const significantMatches: {index: number, length: number, relevance: number}[] = [];
  
  for (const phrase of phrases) {
    // Escape regex special characters in the phrase
    const escapedPhrase = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Create regex to find the phrase (case insensitive, whole words)
    const regex = new RegExp(`\\b${escapedPhrase}\\b`, 'gi');
    
    let match;
    while ((match = regex.exec(text)) !== null) {
      // Get context start and end positions
      const startPos = match.index;
      const endPos = startPos + match[0].length;
      
      // Create a hash of the match position and length to avoid duplicates near same positions
      const matchHash = createHmac('sha256', 'text-ref')
        .update(`${startPos}:${endPos}`)
        .digest('hex')
        .substring(0, 8);
      
      // Calculate relevance between this text segment and the full requirement
      const contextRange = 200; // Characters before and after to check for relevance
      const contextStart = Math.max(0, startPos - contextRange);
      const contextEnd = Math.min(text.length, endPos + contextRange);
      const contextText = text.substring(contextStart, contextEnd);
      
      const relevance = calculateTextRelevance(contextText, requirement);
      
      // Only keep matches with sufficient relevance
      if (relevance > 0.2) {
        significantMatches.push({
          index: startPos,
          length: match[0].length,
          relevance
        });
      }
    }
  }
  
  // Remove overlapping matches, keeping the one with higher relevance
  const filteredMatches = significantMatches
    .sort((a, b) => b.relevance - a.relevance) // Sort by relevance (highest first)
    .filter((match, index, self) => {
      // Keep this match if it doesn't significantly overlap with any previous higher-relevance match
      return !self.slice(0, index).some(prevMatch => {
        const overlap = (
          (match.index >= prevMatch.index && match.index < prevMatch.index + prevMatch.length) ||
          (prevMatch.index >= match.index && prevMatch.index < match.index + match.length)
        );
        return overlap;
      });
    })
    .slice(0, maxReferences); // Limit to max references
  
  // Create TextReference objects for each match
  for (const match of filteredMatches) {
    // Find good sentence boundaries for better context
    const contextBeforeStart = findSentenceBoundary(text, Math.max(0, match.index - 150), true);
    const contextAfterEnd = findSentenceBoundary(text, Math.min(text.length, match.index + match.length + 150), false);
    
    // Extract matched text and context
    const matchedText = text.substring(match.index, match.index + match.length);
    const contextBefore = text.substring(contextBeforeStart, match.index).trim();
    const contextAfter = text.substring(match.index + match.length, contextAfterEnd).trim();
    
    // Create the reference
    references.push({
      id: uuidv4(),
      inputDataId,
      startPosition: match.index,
      endPosition: match.index + match.length,
      text: matchedText,
      contextBefore,
      contextAfter,
      relevance: match.relevance
    });
  }
  
  // Sort by position in the document
  return references.sort((a, b) => a.startPosition - b.startPosition);
}

/**
 * Process a text file to find references for a requirement
 * @param filePath Path to the text file
 * @param requirement The requirement text to find references for
 * @param inputDataId The ID of the input data
 * @returns Array of text references
 */
export async function processTextFileForRequirement(
  filePath: string,
  requirement: string,
  inputDataId: number
): Promise<TextReference[]> {
  try {
    // Read the text file
    const text = fs.readFileSync(filePath, 'utf8');
    
    // Find references
    return findTextReferences(text, requirement, inputDataId);
  } catch (error) {
    console.error('Error processing text file for references:', error);
    return [];
  }
}