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
  labels: string[];
  scores: number[];
  sequence: string;
}

// Constants
const ENDPOINT_URL = "https://at7yvwa5umiteqlq.us-east-1.aws.endpoints.huggingface.cloud";

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
    // Simple health check with a minimal query
    const response = await fetch(ENDPOINT_URL, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        "inputs": "Hello world",
        "parameters": {
          "candidate_labels": "greeting, question, statement"
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
    // Format our input for the zero-shot classification format the endpoint expects
    // We'll craft a more specific prompt to help the model identify contradictions
    const combinedText = `I need to determine if two software requirements contradict each other.
Statement 1: ${premise}
Statement 2: ${hypothesis}
Question: Do these two requirements logically contradict or conflict with each other in a software system?`;
    
    const response = await fetch(ENDPOINT_URL, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        "inputs": combinedText,
        "parameters": {
          "candidate_labels": "yes, no"
        }
      })
    });
    
    if (!response.ok) {
      log(`Error from custom endpoint: ${response.status}`, 'error');
      return 0;
    }
    
    const result = await response.json() as EndpointResponse;
    log(`Custom endpoint response: ${JSON.stringify(result).substring(0, 200)}...`, 'models');
    
    // The endpoint will return scores for "yes" and "no" - we want the "yes" score
    // which indicates probability of contradiction
    if (result && result.labels && result.scores) {
      // Find the index of the "yes" label
      const yesIndex = result.labels.findIndex((label: string) => 
        label.toLowerCase() === 'yes');
      
      if (yesIndex !== -1) {
        return result.scores[yesIndex];
      }
    }
    
    return 0;
  } catch (error) {
    log(`Error querying custom inference endpoint: ${error}`, 'error');
    return 0;
  }
}