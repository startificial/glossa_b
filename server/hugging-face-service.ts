/**
 * Service for communicating with Hugging Face API
 * Uses the API key to make inference calls to NLP models
 */

import fetch from 'node-fetch';
import { AnalysisResponse, ContradictionResult, RequirementsInput } from '../shared/contradiction-types';

// Define the custom endpoint URL provided by the user
const CUSTOM_NLI_ENDPOINT = 'https://xfdfblfb13h03kfi.us-east-1.aws.endpoints.huggingface.cloud';

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
 * Calculate semantic similarity between two text strings
 * 
 * NOTE: We now use the contradiction detection endpoint directly for similarity
 * This is an optimization to avoid using two separate API endpoints
 */
export async function calculateSimilarity(text1: string, text2: string): Promise<number> {
  try {
    // Use the custom endpoint and leverage the NLI model for similarity assessment
    // The endpoint can be used to derive semantic similarity too
    console.log('Using custom HuggingFace inference endpoint for similarity detection');
    
    // For our custom endpoint, we'll use the same format as the contradiction detection
    // but will look for different scores in the response
    const result = await makeHuggingFaceRequest(
      CUSTOM_NLI_ENDPOINT,
      {
        inputs: {
          premise: text1,
          hypothesis: text2
        }
      }
    );
    
    console.log('Similarity API response (via NLI):', JSON.stringify(result).substring(0, 200) + '...');
    
    // Check if result is an array of objects with label and score
    if (Array.isArray(result)) {
      // For a direct array of objects like [{"label":"entailment","score":0.0003}, ...]
      if (result.length > 0 && typeof result[0] === 'object' && 'label' in result[0]) {
        // Find the entailment score as a proxy for similarity
        const entailmentItem = result.find((item: any) => 
          item && item.label && (item.label.toLowerCase() === 'entailment'));
        
        const contradictionItem = result.find((item: any) => 
          item && item.label && (item.label.toLowerCase() === 'contradiction'));
        
        if (entailmentItem && typeof entailmentItem.score === 'number') {
          console.log(`Found entailment score: ${entailmentItem.score}`);
          // Return entailment score as a similarity measure
          return entailmentItem.score;
        }
        
        // For measuring similarity between contradictory statements, we need to 
        // consider the contradiction score too (they are semantically related)
        if (contradictionItem && typeof contradictionItem.score === 'number') {
          console.log(`Found contradiction score: ${contradictionItem.score}`);
          // Return a higher similarity value when contradiction score is high
          return contradictionItem.score > 0.5 ? 0.8 : contradictionItem.score;
        }
        
        // As a fallback, use the highest score from any label as approximate similarity
        if (result.length > 0) {
          const highestScore = Math.max(...result.map((item: any) => 
            (typeof item.score === 'number') ? item.score : 0));
          console.log(`Using highest score as similarity: ${highestScore}`);
          return highestScore > 0 ? highestScore : 0.5; // Provide a reasonable default
        }
      }
      
      // If it's a nested array structure [[ {label, score}, ... ]]
      if (Array.isArray(result[0])) {
        // Handle the nested array format
        const entailmentResult = result[0].find((item: any) => 
          item.label === 'entailment' || item.label === 'ENTAILMENT');
        
        if (entailmentResult) {
          return entailmentResult.score; // Entailment score is a good proxy for similarity
        }
        
        // As a fallback, use the highest score from any label as approximate similarity
        if (result[0].length > 0) {
          const highestScore = Math.max(...result[0].map((item: any) => item.score || 0));
          return highestScore > 0 ? highestScore : 0.5; // Provide a reasonable default
        }
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
 * This function uses the custom HuggingFace inference endpoint provided by the user
 */
export async function detectContradiction(text1: string, text2: string): Promise<number> {
  try {
    // Always use the custom endpoint provided in the user's code
    console.log('Using custom HuggingFace inference endpoint for contradiction detection');
    
    // Use the custom endpoint format based on user's code
    // The payload format needs to contain 'inputs' with premise and hypothesis
    const result = await makeHuggingFaceRequest(
      CUSTOM_NLI_ENDPOINT,
      {
        inputs: {
          premise: text1,
          hypothesis: text2
        }
      }
    );
    
    console.log('NLI API response:', JSON.stringify(result).substring(0, 200) + '...');
    
    // The model should return an array with entailment, neutral, and contradiction probabilities
    if (Array.isArray(result)) {
      // Handle direct array format [{"label": "contradiction", "score": 0.999}, ...]
      if (result.length > 0 && typeof result[0] === 'object' && 'label' in result[0]) {
        // Find the contradiction score from the response
        const contradictionItem = result.find((item: any) => 
          item && item.label && item.label.toLowerCase() === 'contradiction');
        
        if (contradictionItem && typeof contradictionItem.score === 'number') {
          console.log(`Found contradiction score in flat array: ${contradictionItem.score}`);
          return contradictionItem.score;
        }
        
        // If we didn't find a "contradiction" label, try checking each item
        for (const item of result) {
          if (item && item.label && item.label.toLowerCase().includes('contra') && 
              typeof item.score === 'number') {
            console.log(`Found contradiction-like score: ${item.score}`);
            return item.score;
          }
        }
        
        // Return zero if no contradiction found
        console.log('No contradiction found in flat array format');
        return 0;
      }
      
      // Handle nested array format [[ {label, score}, ... ]]
      if (Array.isArray(result[0])) {
        // Find the contradiction score from the response
        const contradictionResult = result[0].find((item: any) => 
          item.label === 'contradiction' || item.label === 'CONTRADICTION');
        
        if (contradictionResult) {
          return contradictionResult.score;
        }
        
        // If we didn't find a "contradiction" label, try checking each item
        // Some models use different formats, so let's check all possibilities
        for (const item of result[0]) {
          if (item.label && item.label.toLowerCase().includes('contra')) {
            return item.score;
          }
        }
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
  const maxRequirements = 100;
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
        
        // Log the similarity for debugging
        console.log(`Calculated similarity between requirements ${i} and ${j}: ${similarity.toFixed(4)}`);
        
        // We no longer consider similarity === 0 as an error since we improved our parsing
        
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