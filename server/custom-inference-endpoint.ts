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
  const apiKey = process.env.CUSTOM_ENDPOINT_API_KEY;
  
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
      const result = await response.json();
      log(`Custom inference health check response: ${JSON.stringify(result).substring(0, 100)}...`, 'models');
      
      // Verify we can parse the response to ensure the endpoint is working correctly
      let validResponse = false;
      
      if (Array.isArray(result)) {
        const contradictionObject = result.find(item => 
          item.label && item.label.toLowerCase() === 'contradiction');
        
        if (contradictionObject && contradictionObject.score !== undefined) {
          validResponse = true;
        }
      }
      
      if (validResponse) {
        log('Custom inference endpoint is available and returning valid responses', 'models');
        return true;
      } else {
        log('Custom inference endpoint returned OK status but invalid response format', 'warning');
        // Still return true because the endpoint is accessible, just not in the expected format
        return true;
      }
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
  const apiKey = process.env.CUSTOM_ENDPOINT_API_KEY;
  
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
    
    const result = await response.json();
    log(`Custom endpoint response: ${JSON.stringify(result).substring(0, 200)}...`, 'models');
    
    // The API returns an array of objects with label/score pairs
    if (Array.isArray(result)) {
      // Find the object with label "contradiction"
      const contradictionObject = result.find(item => 
        item.label && item.label.toLowerCase() === 'contradiction');
      
      if (contradictionObject && contradictionObject.score !== undefined) {
        const contradictionScore = contradictionObject.score;
        log(`Contradiction score for premise: "${premise.substring(0, 50)}..." and hypothesis: "${hypothesis.substring(0, 50)}..." is ${contradictionScore.toFixed(4)}`, 'models');
        return contradictionScore;
      }
    }
    
    // Check if the result has direct properties (original expected format)
    const typedResult = result as EndpointResponse;
    if (typedResult && typeof typedResult.contradiction === 'number') {
      const contradictionScore = typedResult.contradiction;
      log(`Contradiction score from direct property: ${contradictionScore.toFixed(4)}`, 'models');
      return contradictionScore;
    }
    
    // Fallback to old format for backwards compatibility
    if (result && (result as EndpointResponse).labels && (result as EndpointResponse).scores) {
      const labels = (result as EndpointResponse).labels || [];
      const scores = (result as EndpointResponse).scores || [];
      const yesIndex = labels.findIndex((label: string) => 
        label.toLowerCase() === 'yes' || label.toLowerCase() === 'contradiction');
      
      if (yesIndex !== -1) {
        return scores[yesIndex];
      }
    }
    
    log('Could not extract contradiction score from response', 'error');
    return 0;
  } catch (error) {
    log(`Error querying custom inference endpoint: ${error}`, 'error');
    return 0;
  }
}