/**
 * Types for requirement contradiction analysis
 */

/**
 * Information about a single requirement
 */
export interface RequirementInfo {
  index: number;
  text: string;
  id?: number; // Database ID (optional)
}

/**
 * Result of comparing two requirements for contradictions
 */
export interface ContradictionResult {
  requirement1: RequirementInfo;
  requirement2: RequirementInfo;
  similarity_score: number;
  nli_contradiction_score: number;
  model_used?: string; // The AI model used for the analysis
}

/**
 * Response from the contradiction analysis API
 */
export interface AnalysisResponse {
  contradictions: ContradictionResult[];
  processing_time_seconds: number;
  comparisons_made: number;
  nli_checks_made: number;
  errors?: string; // Optional field to indicate any errors during processing
  is_complete: boolean; // Whether the analysis is complete or still processing
  task_id?: number; // The ID of the corresponding task if async
  project_id?: number; // The project ID if available
}

/**
 * Input for the contradiction analysis API
 */
export interface RequirementsInput {
  requirements: string[];
  projectId?: number;
  similarity_threshold_override?: number | null;
  nli_threshold_override?: number | null;
  async?: boolean; // Whether to run the analysis asynchronously (default: false)
  preferredModel?: string; // Optional preferred model to use: 'huggingface', 'anthropic', 'google', or 'ensemble'
}

/**
 * Task status for async contradiction analysis 
 */
export interface ComparisonTaskStatus {
  id: number;
  projectId: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number; // 0-100 percentage
  totalComparisons: number;
  completedComparisons: number;
  currentRequirement1?: number;
  currentRequirement2?: number;
  error?: string;
  startedAt: string;
  completedAt?: string;
  is_stale?: boolean; // Whether the results may be outdated due to requirement changes
}

/**
 * AI model detection result for NLI 
 */
export interface NLIResult {
  entailment?: number;
  neutral?: number;
  contradiction?: number;
  score?: number;
  provider: 'huggingface' | 'huggingface-custom-endpoint' | 'anthropic' | 'google' | 'ensemble';
  additional_info?: {
    entailment?: number;
    neutral?: number;
    [key: string]: any;
  };
}

/**
 * Analysis options for checking contradictions
 */
export interface AnalysisOptions {
  similarityThreshold: number; // 0-1 value for similarity check
  nliThreshold: number; // 0-1 value for NLI contradiction threshold
  maxRequirements: number; // Maximum requirements to analyze
  preferredModel?: string; // Model preference
  fallbackEnabled: boolean; // Whether to try fallback models
}

/**
 * API response for detailed model response data
 */
export interface ModelResponse {
  model: string;
  provider: string;
  raw_response: any;
  processed_result: NLIResult;
  processing_time_ms: number;
}