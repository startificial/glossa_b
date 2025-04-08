import { AnalysisResponse, ContradictionResult, RequirementsInput } from '../shared/contradiction-types';

/**
 * Simple method to detect basic contradictions using keyword analysis
 * This is a fallback implementation when the Python ML service is not available
 */
export async function analyzeContradictions(input: RequirementsInput): Promise<AnalysisResponse> {
  const startTime = Date.now();
  const requirements = input.requirements;
  const similarityThreshold = input.similarity_threshold_override ?? 0.6;
  
  // Keywords that might indicate contradictory statements
  const contradictionKeywords = [
    ['must', 'must not'],
    ['should', 'should not'],
    ['is', 'is not'],
    ['can', 'cannot'],
    ['will', 'will not'],
    ['allow', 'disallow'],
    ['enable', 'disable'],
    ['encrypt', 'plain text'],
    ['active', 'inactive'],
    ['mandatory', 'optional'],
    ['always', 'never'],
    ['all', 'none'],
    ['required', 'not required'],
    ['include', 'exclude'],
    ['open', 'closed'],
    ['automatic', 'manual']
  ];
  
  const contradictions: ContradictionResult[] = [];
  let comparisons = 0;
  let nliChecks = 0;
  
  // Compare each pair of requirements
  for (let i = 0; i < requirements.length; i++) {
    for (let j = i + 1; j < requirements.length; j++) {
      comparisons++;
      const req1 = requirements[i].toLowerCase();
      const req2 = requirements[j].toLowerCase();
      
      // Skip very short requirements
      if (req1.length < 10 || req2.length < 10) continue;
      
      // Calculate Jaccard similarity
      const similarity = calculateJaccardSimilarity(req1, req2);
      
      if (similarity >= similarityThreshold) {
        nliChecks++;
        
        // Check for contradiction keywords
        let isContradiction = false;
        let contradictionScore = 0;
        
        for (const [positive, negative] of contradictionKeywords) {
          const hasPositive1 = req1.includes(positive.toLowerCase());
          const hasNegative1 = req1.includes(negative.toLowerCase());
          const hasPositive2 = req2.includes(positive.toLowerCase());
          const hasNegative2 = req2.includes(negative.toLowerCase());
          
          // If one has positive and other has negative, likely contradiction
          if ((hasPositive1 && hasNegative2) || (hasNegative1 && hasPositive2)) {
            isContradiction = true;
            contradictionScore = Math.max(contradictionScore, 0.9);
            break;
          }
        }
        
        // Additional heuristics to detect semantic opposites
        if (!isContradiction) {
          // Check for "not" and other negation words
          const req1HasNot = (req1.includes(" not ") || req1.includes("n't "));
          const req2HasNot = (req2.includes(" not ") || req2.includes("n't "));
          
          // If they have high similarity but one has negation and the other doesn't
          if (similarity > 0.7 && req1HasNot !== req2HasNot) {
            isContradiction = true;
            contradictionScore = 0.85;
          }
        }
        
        if (isContradiction) {
          contradictions.push({
            requirement1: { index: i, text: requirements[i] },
            requirement2: { index: j, text: requirements[j] },
            similarity_score: similarity,
            nli_contradiction_score: contradictionScore
          });
        }
      }
    }
  }
  
  const processingTime = (Date.now() - startTime) / 1000;
  
  return {
    contradictions,
    processing_time_seconds: processingTime,
    comparisons_made: comparisons,
    nli_checks_made: nliChecks
  };
}

/**
 * Calculate Jaccard similarity between two strings
 * Jaccard similarity = (size of intersection) / (size of union)
 */
function calculateJaccardSimilarity(str1: string, str2: string): number {
  // Get arrays of words
  const words1Array = str1.split(/\s+/).filter(w => w.length > 0);
  const words2Array = str2.split(/\s+/).filter(w => w.length > 0);
  
  // Create a unique list of words from each array
  const uniqueWords1: {[key: string]: boolean} = {};
  const uniqueWords2: {[key: string]: boolean} = {};
  
  words1Array.forEach(word => { uniqueWords1[word] = true; });
  words2Array.forEach(word => { uniqueWords2[word] = true; });
  
  // Count intersection
  let intersectionCount = 0;
  for (const word in uniqueWords1) {
    if (uniqueWords2[word]) {
      intersectionCount++;
    }
  }
  
  // Count union
  let unionCount = 0;
  const allWords: {[key: string]: boolean} = {};
  
  // Combine all words
  for (const word in uniqueWords1) allWords[word] = true;
  for (const word in uniqueWords2) allWords[word] = true;
  
  // Count unique words in union
  for (const word in allWords) {
    unionCount++;
  }
  
  return unionCount === 0 ? 0 : intersectionCount / unionCount;
}

/**
 * Check if an external ML contradiction service is available
 * In a real implementation, this would check if the Python service is running
 */
export async function isContradictionServiceAvailable(): Promise<boolean> {
  // For now, always return false to use the fallback implementation
  return false;
}