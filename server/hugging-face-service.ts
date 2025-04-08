/**
 * Service for communicating with Hugging Face API
 * Uses the API key to make inference calls to NLP models
 */

import fetch from 'node-fetch';
import { AnalysisResponse, ContradictionResult, RequirementsInput } from '../shared/contradiction-types';

// Constants for model endpoints - using specified models from config
const SIMILARITY_MODEL = 'sentence-transformers/all-mpnet-base-v2';
const NLI_MODEL = 'MoritzLaurer/DeBERTa-v3-base-mnli';

/**
 * Check if the HuggingFace API is available and configured
 * This always returns true as we require the API key to be available
 */
export async function isHuggingFaceAvailable(): Promise<boolean> {
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  
  if (!apiKey) {
    console.error('Hugging Face API key not found in environment - this will cause errors');
    // Still return true as we're requiring the service
    return true;
  }
  
  console.log('Hugging Face API key found, service is available');
  return true;
}

/**
 * Wait with exponential backoff
 * @param attempt Current attempt number (starting from 0)
 * @param baseDelay Base delay in milliseconds
 * @returns Promise that resolves after the delay
 */
const waitWithBackoff = async (attempt: number, baseDelay: number = 1000): Promise<void> => {
  const delay = baseDelay * Math.pow(2, attempt); // Exponential backoff
  const jitter = Math.random() * 0.1 * delay; // Add 0-10% jitter
  console.log(`Waiting ${Math.round((delay + jitter) / 1000)}s before retry...`);
  await new Promise(resolve => setTimeout(resolve, delay + jitter));
};

/**
 * Helper function to make a request to the Hugging Face API with improved retry logic
 */
async function makeHuggingFaceRequest(url: string, body: any, maxRetries = 5, baseRetryDelay = 1000): Promise<any> {
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  
  if (!apiKey) {
    throw new Error('HuggingFace API key not found in environment');
  }
  
  let lastError;
  const modelName = url.split('/models/')[1] || 'unknown';
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // If this isn't the first attempt, wait with exponential backoff before retrying
      if (attempt > 0) {
        console.log(`Retrying request to ${modelName} (attempt ${attempt + 1}/${maxRetries})...`);
        await waitWithBackoff(attempt, baseRetryDelay);
      }
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body)
      });
      
      if (!response.ok) {
        // Check for specific error codes
        if (response.status === 503) {
          // Service unavailable - likely model is loading or busy
          console.log(`Model ${modelName} service unavailable (503), will retry...`);
          lastError = new Error(`HuggingFace model service unavailable (503)`);
          // Don't need explicit continue as the loop will continue anyway
        } else if (response.status === 429) {
          // Too many requests - rate limited
          console.log(`Rate limited (429) for model ${modelName}, will retry with longer backoff...`);
          lastError = new Error(`HuggingFace API rate limit reached (429)`);
          // More aggressive backoff for rate limits
          await waitWithBackoff(attempt + 2, baseRetryDelay);
        } else {
          // For other errors, just log a clean message without the HTML
          const errorMessage = `HuggingFace API error for model ${modelName}: ${response.status}`;
          console.error(errorMessage);
          throw new Error(errorMessage);
        }
      } else {
        // Successful response - parse and return JSON
        return await response.json();
      }
    } catch (error) {
      lastError = error;
      console.error(`Request attempt ${attempt + 1} to ${modelName} failed:`, error);
      // If it's the last attempt, don't wait, just throw the error outside the loop
      if (attempt === maxRetries - 1) {
        break;
      }
    }
  }
  
  // If we get here, all retries failed
  throw lastError || new Error(`Maximum retries (${maxRetries}) exceeded for HuggingFace API request to ${modelName}`);
}

/**
 * Calculate semantic similarity between two text strings using HuggingFace model
 */
export async function calculateSimilarity(text1: string, text2: string): Promise<number> {
  try {
    // For all-mpnet-base-v2, the expected input format is 
    // { inputs: { source_sentence: string, sentences: string[] } }
    const result = await makeHuggingFaceRequest(
      `https://api-inference.huggingface.co/models/${SIMILARITY_MODEL}`,
      {
        inputs: {
          source_sentence: text1,
          sentences: [text2]
        }
      }
    );
    
    console.log('Similarity API response:', JSON.stringify(result).substring(0, 200) + '...');
    
    // Check if the result is an array and has at least one element
    if (Array.isArray(result) && result.length > 0) {
      return result[0]; // The model returns similarity scores between 0 and 1
    }
    
    // Some sentence transformer models return { [key: string]: number } format
    if (typeof result === 'object' && result !== null) {
      // Look for any property that might be a similarity score
      const possibleScores = Object.values(result).filter(v => typeof v === 'number');
      if (possibleScores.length > 0) {
        return possibleScores[0];
      }
    }
    
    console.warn('Unexpected similarity response format:', result);
    return 0;
  } catch (error) {
    console.error('Error calculating similarity:', error);
    // Return a default value (0) to allow processing to continue
    return 0;
  }
}

/**
 * Perform natural language inference (NLI) to detect contradictions
 * Returns a contradiction score between 0 and 1
 * 
 * This function now uses a custom HuggingFace inference endpoint for more reliability
 */
export async function detectContradiction(text1: string, text2: string): Promise<number> {
  try {
    // First check if we should use the custom endpoint
    if (process.env.HF_ENDPOINT_API_KEY) {
      // Import the custom endpoint service dynamically to avoid circular imports
      const { detectContradictionWithEndpoint } = await import('./custom-inference-endpoint');
      
      // Use the custom endpoint for more reliable results
      console.log('Using custom inference endpoint for contradiction detection');
      return await detectContradictionWithEndpoint(text1, text2);
    }
    
    // Fall back to standard HuggingFace API if no custom endpoint is configured
    console.log('Using standard HuggingFace API for contradiction detection');
    
    // For DeBERTa-v3 the expected format is {"inputs": "premise\nhypothesis"}
    const result = await makeHuggingFaceRequest(
      `https://api-inference.huggingface.co/models/${NLI_MODEL}`,
      {
        inputs: `${text1}\n${text2}`,
      }
    );
    
    console.log('NLI API response:', JSON.stringify(result).substring(0, 200) + '...');
    
    // The model should return an array with entailment, neutral, and contradiction probabilities
    // Depending on the exact format from MoritzLaurer/DeBERTa-v3-base-mnli
    if (Array.isArray(result)) {
      // Find the contradiction score
      const contradictionResult = result.find((item: any) => 
        item.label === 'contradiction' || item.label === 'CONTRADICTION');
      
      if (contradictionResult) {
        return contradictionResult.score;
      }
      
      // If we didn't find a "contradiction" label, try checking for indices
      // Some models return [entailment, neutral, contradiction] in that order
      if (result.length === 3 && typeof result[2]?.score === 'number') {
        return result[2].score;
      }
    }
    
    console.warn('Unexpected NLI response format:', result);
    return 0;
  } catch (error) {
    console.error('Error detecting contradiction:', error);
    // Return a default value (0) to allow processing to continue
    return 0;
  }
}

/**
 * Analyze requirements for contradictions using HuggingFace NLP models
 */
export async function analyzeContradictionsWithHuggingFace(
  input: RequirementsInput
): Promise<AnalysisResponse> {
  const startTime = Date.now();
  const requirements = input.requirements;
  
  // Apply default thresholds or use provided overrides
  const similarityThreshold = input.similarity_threshold_override ?? 0.6;
  const nliThreshold = input.nli_threshold_override ?? 0.55;
  
  // Limit the number of requirements to avoid timeouts or rate limits
  const maxRequirements = 30;
  const actualRequirements = requirements.length > maxRequirements 
    ? requirements.slice(0, maxRequirements) 
    : requirements;
  
  if (requirements.length > maxRequirements) {
    console.log(`Limiting analysis to first ${maxRequirements} requirements out of ${requirements.length} total`);
  }
  
  const contradictions: ContradictionResult[] = [];
  let comparisons = 0;
  let nliChecks = 0;
  let apiErrors = 0;
  
  // Compare each pair of requirements
  for (let i = 0; i < actualRequirements.length; i++) {
    const req1 = actualRequirements[i];
    
    // Skip very short requirements
    if (!req1 || req1.length < 10) continue;
    
    for (let j = i + 1; j < actualRequirements.length; j++) {
      const req2 = actualRequirements[j];
      comparisons++;
      
      // Skip very short requirements
      if (!req2 || req2.length < 10) continue;
      
      // Skip if too many API errors have occurred
      if (apiErrors > 5) {
        console.log(`Stopping analysis after encountering ${apiErrors} API errors`);
        break;
      }
      
      try {
        // First check similarity
        const similarity = await calculateSimilarity(req1, req2);
        
        // If the similarity is 0, it may be due to API error, so skip
        if (similarity === 0) {
          apiErrors++;
          continue;
        }
        
        // If similar enough, check for contradiction in both directions
        if (similarity >= similarityThreshold) {
          nliChecks += 2; // We're making 2 checks now
          
          // Check contradiction in both directions (req1->req2 and req2->req1)
          console.log(`Checking contradiction between requirements ${i} and ${j}`);
          console.log(`Requirement 1: ${req1.substring(0, 50)}...`);
          console.log(`Requirement 2: ${req2.substring(0, 50)}...`);
          
          const contradictionScore1 = await detectContradiction(req1, req2);
          const contradictionScore2 = await detectContradiction(req2, req1);
          
          // Take the maximum of the two scores
          const finalContradictionScore = Math.max(contradictionScore1, contradictionScore2);
          
          console.log(`Contradiction scores: ${contradictionScore1.toFixed(3)} / ${contradictionScore2.toFixed(3)}`);
          console.log(`Final contradiction score: ${finalContradictionScore.toFixed(3)}`);
          
          // If contradiction score is high enough in either direction, add to results
          if (finalContradictionScore >= nliThreshold) {
            console.log(`Found contradiction between requirements ${i} and ${j} with score ${finalContradictionScore.toFixed(3)}`);
            
            contradictions.push({
              requirement1: { index: i, text: req1 },
              requirement2: { index: j, text: req2 },
              similarity_score: similarity,
              nli_contradiction_score: finalContradictionScore
            });
          }
        }
      } catch (error) {
        console.error(`Error analyzing requirements ${i} and ${j}:`, error);
        apiErrors++;
        // Continue with other comparisons if one fails
      }
    }
    
    // If too many API errors, stop the analysis
    if (apiErrors > 5) {
      console.log(`Stopping analysis after encountering ${apiErrors} API errors`);
      break;
    }
  }
  
  const processingTime = (Date.now() - startTime) / 1000;
  
  return {
    contradictions,
    processing_time_seconds: processingTime,
    comparisons_made: comparisons,
    nli_checks_made: nliChecks,
    errors: apiErrors > 0 ? `Encountered ${apiErrors} API errors during analysis` : undefined
  };
}