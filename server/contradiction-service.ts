import { AnalysisResponse, RequirementsInput, ComparisonTaskStatus } from '../shared/contradiction-types';
import { analyzeContradictionsWithHuggingFace } from './hugging-face-service';
import { 
  analyzeContradictions as analyzeContradictionsAsync, 
  getContradictionAnalysisStatus, 
  getStoredContradictionResults 
} from './multimodel-contradiction-service';

/**
 * Main method to analyze contradictions - always uses HuggingFace API
 * Now supports both synchronous and asynchronous processing
 */
export async function analyzeContradictions(input: RequirementsInput): Promise<AnalysisResponse> {
  console.log('Using HuggingFace API for contradiction analysis');
  console.log('Models in use:');
  console.log('- Similarity: sentence-transformers/all-mpnet-base-v2');
  console.log('- NLI: MoritzLaurer/DeBERTa-v3-base-mnli');

  // If async processing is requested and projectId is provided, use async implementation
  if (input.async && input.projectId) {
    console.log(`Starting asynchronous contradiction analysis for project ${input.projectId}`);
    return analyzeContradictionsAsync(input);
  }
  
  // Otherwise use the existing synchronous implementation
  console.log('Starting synchronous contradiction analysis');
  return analyzeContradictionsWithHuggingFace(input);
}

/**
 * Check if the HuggingFace service is available - always returns true
 * since we're requiring the service to be available via API key
 */
export async function isContradictionServiceAvailable(): Promise<boolean> {
  return true;
}

/**
 * Get the status of an ongoing contradiction analysis task
 */
export async function getAnalysisStatus(taskId: number): Promise<ComparisonTaskStatus | null> {
  return getContradictionAnalysisStatus(taskId);
}

/**
 * Get stored contradiction results for a project
 */
export async function getProjectContradictions(projectId: number): Promise<AnalysisResponse> {
  return getStoredContradictionResults(projectId);
}