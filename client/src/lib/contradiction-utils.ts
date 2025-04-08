import { AnalysisResponse, RequirementsInput } from '../../../shared/contradiction-types';

/**
 * Calls the backend API to find contradictions in a list of requirements.
 *
 * @param requirements - An array of requirement strings.
 * @param similarityThreshold - Optional similarity threshold override.
 * @param nliThreshold - Optional NLI contradiction threshold override.
 * @returns A Promise resolving to the AnalysisResponse object containing contradictions and metadata.
 * @throws An error if the API call fails or returns an error status.
 */
export async function findRequirementContradictions(
  requirements: string[],
  similarityThreshold?: number | null,
  nliThreshold?: number | null
): Promise<AnalysisResponse> {
  const requestBody: RequirementsInput = {
    requirements: requirements,
    similarity_threshold_override: similarityThreshold,
    nli_threshold_override: nliThreshold
  };

  try {
    const response = await fetch('/api/requirements/analyze-contradictions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      // Try to get error details from the response body
      let errorDetails = `API request failed with status ${response.status}`;
      try {
        const errorJson = await response.json();
        if (errorJson.detail) {
          errorDetails += `: ${errorJson.detail}`;
        }
      } catch (e) {
        // Ignore if response body is not JSON or empty
        errorDetails += `: ${response.statusText}`;
      }
      throw new Error(errorDetails);
    }

    const results: AnalysisResponse = await response.json();
    return results;
  } catch (error) {
    console.error('Error calling contradiction analysis API:', error);
    // Re-throw the error so the calling code can handle it
    throw error;
  }
}

/**
 * Simple method to find potential duplicate requirements based on text similarity
 * This is a temporary solution until the full ML-based contradiction detection is implemented
 * 
 * @param requirements - Array of requirement text strings
 * @param similarityThreshold - Similarity threshold (0-1) to consider requirements as duplicates
 * @returns Array of potential duplicates with similarity scores
 */
export function findDuplicateRequirements(
  requirements: string[], 
  similarityThreshold: number = 0.8
): { req1Index: number; req2Index: number; similarity: number }[] {
  const results: { req1Index: number; req2Index: number; similarity: number }[] = [];
  
  // Simple implementation using string comparison
  for (let i = 0; i < requirements.length; i++) {
    for (let j = i + 1; j < requirements.length; j++) {
      const req1 = requirements[i].toLowerCase();
      const req2 = requirements[j].toLowerCase();
      
      // Calculate Jaccard similarity between the two requirements
      const similarity = calculateJaccardSimilarity(req1, req2);
      
      if (similarity >= similarityThreshold) {
        results.push({ req1Index: i, req2Index: j, similarity });
      }
    }
  }
  
  return results;
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