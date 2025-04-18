/**
 * Model Warming Service
 * 
 * This service helps "warm up" HuggingFace models by sending initial requests
 * that will load the models into memory, reducing 503 errors during actual use.
 * 
 * It also checks the availability of the custom inference endpoint.
 */

import fetch from 'node-fetch';
import { log } from './vite';

// Define the custom endpoint URL
const CUSTOM_NLI_ENDPOINT = 'https://xfdfblfb13h03kfi.us-east-1.aws.endpoints.huggingface.cloud';

/**
 * Wait with exponential backoff
 * @param attempt Current attempt number (starting from 0)
 * @param baseDelay Base delay in milliseconds
 * @returns Promise that resolves after the delay
 */
const waitWithBackoff = async (attempt: number, baseDelay: number = 1000): Promise<void> => {
  const delay = baseDelay * Math.pow(2, attempt); // Exponential backoff
  const jitter = Math.random() * 0.1 * delay; // Add 0-10% jitter to avoid thundering herd
  await new Promise(resolve => setTimeout(resolve, delay + jitter));
};

/**
 * Send a lightweight request to the custom endpoint to wake it up
 * @param maxRetries Maximum number of retries
 * @param initialDelay Initial delay in milliseconds
 * @returns Promise resolving to true if successful, false otherwise
 */
export async function warmCustomEndpoint(
  maxRetries: number = 5, 
  initialDelay: number = 1000
): Promise<boolean> {
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  
  if (!apiKey) {
    console.error('Cannot warm custom endpoint: HuggingFace API key not found in environment');
    return false;
  }
  
  // Prepare a very small test request for the custom endpoint
  // Using the format from the user's provided code
  const body = {
    inputs: {
      premise: "The weather is sunny today.",
      hypothesis: "It is a nice day."
    }
  };
  
  console.log('Starting warm-up request for custom endpoint');
  
  // Attempt to warm the endpoint with retries
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`Warm-up attempt ${attempt + 1}/${maxRetries} for custom endpoint...`);
        await waitWithBackoff(attempt, initialDelay);
      }
      
      const response = await fetch(CUSTOM_NLI_ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body)
      });
      
      if (response.ok) {
        console.log('✅ Custom HuggingFace inference endpoint successfully warmed up!');
        return true;
      }
      
      // Get status code and determine if we should retry
      const status = response.status;
      console.log(`Warm-up request for custom endpoint returned status ${status}`);
      
      // 503 means the endpoint is still loading
      if (status === 503) {
        console.log('Custom endpoint is loading, will retry...');
        continue;
      } else if (status === 429) {
        // Rate limited, back off more aggressively
        console.log('Rate limited (429) when warming custom endpoint, will retry with longer backoff...');
        await waitWithBackoff(attempt + 2, initialDelay); // More aggressive backoff for rate limits
        continue;
      } else {
        // Some other error
        console.error(`Error warming custom endpoint: HTTP ${status}`);
        return false;
      }
    } catch (err) {
      console.error('Error during warm-up request for custom endpoint:', err);
      // Continue with next retry
    }
  }
  
  console.warn(`⚠️ Failed to warm up custom endpoint after ${maxRetries} attempts`);
  return false;
}

/**
 * Check if the custom inference endpoint is available
 * @returns Promise<boolean> True if the endpoint is available and responsive
 */
export async function checkCustomEndpoint(): Promise<boolean> {
  if (!process.env.CUSTOM_ENDPOINT_API_KEY) {
    log('Custom endpoint API key not found, skipping check', 'models');
    return false;
  }

  try {
    // Import the endpoint service
    const { isEndpointAvailable } = await import('./custom-inference-endpoint');
    
    // Check if the endpoint is available
    const available = await isEndpointAvailable();
    
    if (available) {
      log('✅ Custom inference endpoint is available and will be used for contradiction detection', 'models');
    } else {
      log('⚠️ Custom inference endpoint is not available, will fall back to standard API', 'models');
    }
    
    return available;
  } catch (error) {
    log(`Error checking custom endpoint: ${error}`, 'error');
    return false;
  }
}

/**
 * Warm the custom endpoint
 * @returns Promise resolving when all warming attempts are complete
 */
export async function warmAllModels(): Promise<void> {
  log('Starting warm-up for HuggingFace custom endpoint...', 'models');
  
  // Check if the custom endpoint is available
  await checkCustomEndpoint();
  
  // Warm up the custom endpoint
  const success = await warmCustomEndpoint();
  
  if (success) {
    log('Custom endpoint warming complete and successful.', 'models');
  } else {
    log('Custom endpoint warming failed or was skipped.', 'models');
  }
}

/**
 * Schedule periodic model warming
 * @param intervalMinutes Minutes between warming attempts
 */
export function scheduleModelWarming(intervalMinutes: number = 60): NodeJS.Timeout {
  console.log(`Scheduling model warming every ${intervalMinutes} minutes`);
  
  // Initial warm-up
  warmAllModels().catch(err => {
    console.error("Error during initial model warming:", err);
  });
  
  // Set up recurring warm-up
  return setInterval(() => {
    console.log("Running scheduled model warming...");
    warmAllModels().catch(err => {
      console.error("Error during scheduled model warming:", err);
    });
  }, intervalMinutes * 60 * 1000);
}