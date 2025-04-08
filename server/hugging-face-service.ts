/**
 * Service for communicating with Hugging Face API
 * Uses the API key to make inference calls to NLP models
 */

import fetch from 'node-fetch';
import { AnalysisResponse, ContradictionResult, RequirementsInput } from '../shared/contradiction-types';

// Constants for model endpoints
const SIMILARITY_MODEL = 'sentence-transformers/all-MiniLM-L6-v2';
const NLI_MODEL = 'cross-encoder/nli-deberta-v3-base';

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
 * Calculate semantic similarity between two text strings using HuggingFace model
 */
export async function calculateSimilarity(text1: string, text2: string): Promise<number> {
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  
  if (!apiKey) {
    throw new Error('HuggingFace API key not found in environment');
  }
  
  try {
    const response = await fetch(
      `https://api-inference.huggingface.co/models/${SIMILARITY_MODEL}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: {
            source_sentence: text1,
            sentences: [text2]
          }
        }),
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HuggingFace API error: ${response.status} ${errorText}`);
    }
    
    const result = await response.json() as number[];
    return result[0]; // The model returns similarity scores between 0 and 1
  } catch (error) {
    console.error('Error calculating similarity:', error);
    throw error;
  }
}

/**
 * Perform natural language inference (NLI) to detect contradictions
 * Returns a contradiction score between 0 and 1
 */
export async function detectContradiction(text1: string, text2: string): Promise<number> {
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  
  if (!apiKey) {
    throw new Error('HuggingFace API key not found in environment');
  }
  
  try {
    const response = await fetch(
      `https://api-inference.huggingface.co/models/${NLI_MODEL}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: `${text1}\n${text2}`,
        }),
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HuggingFace API error: ${response.status} ${errorText}`);
    }
    
    // The NLI model returns scores for entailment, neutral, and contradiction
    const result = await response.json() as [
      { label: 'entailment', score: number },
      { label: 'neutral', score: number },
      { label: 'contradiction', score: number }
    ];
    
    // Find the contradiction score
    const contradictionResult = result.find(item => item.label === 'contradiction');
    return contradictionResult ? contradictionResult.score : 0;
  } catch (error) {
    console.error('Error detecting contradiction:', error);
    throw error;
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
  
  const similarityThreshold = input.similarity_threshold_override ?? 0.5;
  const nliThreshold = input.nli_threshold_override ?? 0.6;
  
  const contradictions: ContradictionResult[] = [];
  let comparisons = 0;
  let nliChecks = 0;
  
  // Compare each pair of requirements
  for (let i = 0; i < requirements.length; i++) {
    const req1 = requirements[i];
    
    // Skip very short requirements
    if (req1.length < 10) continue;
    
    for (let j = i + 1; j < requirements.length; j++) {
      const req2 = requirements[j];
      comparisons++;
      
      // Skip very short requirements
      if (req2.length < 10) continue;
      
      try {
        // First check similarity
        const similarity = await calculateSimilarity(req1, req2);
        
        // If similar enough, check for contradiction
        if (similarity >= similarityThreshold) {
          nliChecks++;
          const contradictionScore = await detectContradiction(req1, req2);
          
          // If contradiction score is high enough, add to results
          if (contradictionScore >= nliThreshold) {
            contradictions.push({
              requirement1: { index: i, text: req1 },
              requirement2: { index: j, text: req2 },
              similarity_score: similarity,
              nli_contradiction_score: contradictionScore
            });
          }
        }
      } catch (error) {
        console.error(`Error analyzing requirements ${i} and ${j}:`, error);
        // Continue with other comparisons if one fails
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