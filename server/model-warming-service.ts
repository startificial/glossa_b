/**
 * Model Warming Service
 * 
 * This service helps "warm up" HuggingFace models by sending initial requests
 * that will load the models into memory, reducing 503 errors during actual use.
 */

import fetch from 'node-fetch';

// Models that need warming
const MODELS_TO_WARM = [
  'sentence-transformers/all-mpnet-base-v2', // Similarity model
  'MoritzLaurer/DeBERTa-v3-base-mnli'        // NLI model
];

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
 * Send a lightweight request to a model to wake it up
 * @param model Model identifier
 * @param maxRetries Maximum number of retries
 * @param initialDelay Initial delay in milliseconds
 * @returns Promise resolving to true if successful, false otherwise
 */
export async function warmModel(
  model: string, 
  maxRetries: number = 5, 
  initialDelay: number = 1000
): Promise<boolean> {
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  
  if (!apiKey) {
    console.error(`Cannot warm model ${model}: HuggingFace API key not found in environment`);
    return false;
  }
  
  // Prepare a very small request specific to model type
  let body: any;
  if (model.includes('sentence-transformers')) {
    // For sentence transformers (similarity model)
    body = {
      inputs: {
        source_sentence: "Hello",
        sentences: ["Hello"]
      }
    };
  } else if (model.includes('DeBERTa')) {
    // For NLI model
    body = {
      inputs: "Hello\nHello"
    };
  } else {
    // Generic small request
    body = {
      inputs: "Hello"
    };
  }
  
  console.log(`Starting warm-up request for model: ${model}`);
  
  // Attempt to warm the model with retries
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`Warm-up attempt ${attempt + 1}/${maxRetries} for model ${model}...`);
        await waitWithBackoff(attempt, initialDelay);
      }
      
      const response = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body)
      });
      
      if (response.ok) {
        console.log(`✅ Model ${model} successfully warmed up!`);
        return true;
      }
      
      // Get status code and determine if we should retry
      const status = response.status;
      console.log(`Warm-up request for model ${model} returned status ${status}`);
      
      // 503 means the model is still loading
      if (status === 503) {
        console.log(`Model ${model} is loading, will retry...`);
        continue;
      } else if (status === 429) {
        // Rate limited, back off more aggressively
        console.log(`Rate limited (429) when warming model ${model}, will retry with longer backoff...`);
        await waitWithBackoff(attempt + 2, initialDelay); // More aggressive backoff for rate limits
        continue;
      } else {
        // Some other error
        console.error(`Error warming model ${model}: HTTP ${status}`);
        return false;
      }
    } catch (err) {
      console.error(`Error during warm-up request for model ${model}:`, err);
      // Continue with next retry
    }
  }
  
  console.warn(`⚠️ Failed to warm up model ${model} after ${maxRetries} attempts`);
  return false;
}

/**
 * Warm all models in parallel
 * @returns Promise resolving when all warming attempts are complete
 */
export async function warmAllModels(): Promise<void> {
  console.log(`Starting warm-up for ${MODELS_TO_WARM.length} HuggingFace models...`);
  
  // Warm models in parallel
  const results = await Promise.all(
    MODELS_TO_WARM.map(model => warmModel(model))
  );
  
  const successCount = results.filter(Boolean).length;
  console.log(`Model warming complete. ${successCount}/${MODELS_TO_WARM.length} models successfully warmed up.`);
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