/**
 * Types for requirement contradiction analysis
 */

/**
 * Information about a single requirement
 */
export interface RequirementInfo {
  index: number;
  text: string;
}

/**
 * Result of comparing two requirements for contradictions
 */
export interface ContradictionResult {
  requirement1: RequirementInfo;
  requirement2: RequirementInfo;
  similarity_score: number;
  nli_contradiction_score: number;
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
}

/**
 * Input for the contradiction analysis API
 */
export interface RequirementsInput {
  requirements: string[];
  similarity_threshold_override?: number | null;
  nli_threshold_override?: number | null;
}