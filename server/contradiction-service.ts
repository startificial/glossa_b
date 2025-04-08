import { AnalysisResponse, RequirementsInput } from '../shared/contradiction-types';
import { analyzeContradictionsWithHuggingFace } from './hugging-face-service';

/**
 * Main method to analyze contradictions - always uses HuggingFace API
 */
export async function analyzeContradictions(input: RequirementsInput): Promise<AnalysisResponse> {
  console.log('Using HuggingFace API for contradiction analysis');
  console.log('Models in use:');
  console.log('- Similarity: sentence-transformers/all-mpnet-base-v2');
  console.log('- NLI: MoritzLaurer/DeBERTa-v3-base-mnli');
  
  return analyzeContradictionsWithHuggingFace(input);
}

/**
 * Check if the HuggingFace service is available - always returns true
 * since we're requiring the service to be available via API key
 */
export async function isContradictionServiceAvailable(): Promise<boolean> {
  return true;
}