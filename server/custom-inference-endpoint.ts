/**
 * Custom Inference Endpoint Service
 * 
 * This module provides functions to call a dedicated HuggingFace inference endpoint
 * which offers more reliability than the standard HuggingFace API.
 */

import fetch from 'node-fetch';
import { log } from './vite';

// Define an interface for the endpoint response
interface EndpointResponse {
  // Old zero-shot classification format
  labels?: string[];
  scores?: number[];
  sequence?: string;
  
  // New NLI model format
  contradiction?: number;
  entailment?: number;
  neutral?: number;
}

// Constants
const ENDPOINT_URL = "https://xfdfblfb13h03kfi.us-east-1.aws.endpoints.huggingface.cloud";

/**
 * Check if the custom inference endpoint is available
 * @returns Promise<boolean> True if the endpoint is available
 */
export async function isEndpointAvailable(): Promise<boolean> {
  const apiKey = process.env.HF_ENDPOINT_API_KEY;
  
  if (!apiKey) {
    log('Custom inference endpoint API key not found in environment', 'error');
    return false;
  }
  
  try {
    // Simple health check with a minimal query using the premise-hypothesis format
    const response = await fetch(ENDPOINT_URL, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        "inputs": {
          "premise": "A man is walking his dog in the park.", 
          "hypothesis": "A person is outside with an animal."
        }
      })
    });
    
    if (response.ok) {
      log('Custom inference endpoint is available', 'models');
      return true;
    } else {
      log(`Custom inference endpoint returned status ${response.status}`, 'error');
      return false;
    }
  } catch (error) {
    log(`Error checking custom inference endpoint: ${error}`, 'error');
    return false;
  }
}

/**
 * Query the custom inference endpoint for NLI
 * This function is specifically for contradiction detection
 * 
 * @param premise The first statement (requirement 1)
 * @param hypothesis The second statement (requirement 2)
 * @returns Promise<number> A score between 0 and 1 representing the likelihood of contradiction
 */
export async function detectContradictionWithEndpoint(premise: string, hypothesis: string): Promise<number> {
  const apiKey = process.env.HF_ENDPOINT_API_KEY;
  
  if (!apiKey) {
    log('Custom inference endpoint API key not found in environment', 'error');
    return 0;
  }
  
  try {
    // Use the premise-hypothesis structure for the NLI model
    const response = await fetch(ENDPOINT_URL, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        "inputs": {
          "premise": premise,
          "hypothesis": hypothesis
        }
      })
    });
    
    if (!response.ok) {
      log(`Error from custom endpoint: ${response.status}`, 'error');
      return 0;
    }
    
    const result = await response.json() as EndpointResponse;
    log(`Custom endpoint response: ${JSON.stringify(result).substring(0, 200)}...`, 'models');
    
    // The NLI model will return contradiction, entailment, and neutral scores
    // We only care about the contradiction score
    if (result && result.contradiction !== undefined) {
      const contradictionScore = result.contradiction;
      log(`Contradiction score for premise: "${premise.substring(0, 50)}..." and hypothesis: "${hypothesis.substring(0, 50)}..." is ${contradictionScore.toFixed(4)}`, 'models');
      return contradictionScore;
    }
    
    // Fallback to old format if somehow we get it
    if (result && result.labels && result.scores) {
      const yesIndex = result.labels.findIndex((label: string) => 
        label.toLowerCase() === 'yes' || label.toLowerCase() === 'contradiction');
      
      if (yesIndex !== -1) {
        return result.scores[yesIndex];
      }
    }
    
    log('Could not extract contradiction score from response', 'error');
    return 0;
  } catch (error) {
    log(`Error querying custom inference endpoint: ${error}`, 'error');
    return 0;
  }
}