/**
 * HuggingFace-based Contradiction Detection Service
 * 
 * This service implements contradiction detection between requirements text
 * using the HuggingFace inference endpoint for natural language inference.
 * It supports both synchronous and asynchronous processing to improve UI responsiveness.
 */

import { 
  AnalysisOptions, 
  AnalysisResponse, 
  ContradictionResult, 
  NLIResult, 
  RequirementsInput
} from '../shared/contradiction-types';
import { storage } from './storage';
import { 
  InsertRequirementComparison, 
  InsertRequirementComparisonTask, 
  Requirement
} from '../shared/schema';
import fetch from 'node-fetch';

// Define the custom endpoint URL
const CUSTOM_NLI_ENDPOINT = 'https://xfdfblfb13h03kfi.us-east-1.aws.endpoints.huggingface.cloud';
const DEFAULT_OPTIONS: AnalysisOptions = {
  similarityThreshold: 0.6,
  nliThreshold: 0.55,
  maxRequirements: 100,
  fallbackEnabled: true
};

/**
 * Main entry point for contradiction analysis, supporting both sync and async modes
 */
export async function analyzeContradictions(input: RequirementsInput): Promise<AnalysisResponse> {
  // Apply default options or use provided overrides
  const options: AnalysisOptions = {
    ...DEFAULT_OPTIONS,
    similarityThreshold: input.similarity_threshold_override ?? DEFAULT_OPTIONS.similarityThreshold,
    nliThreshold: input.nli_threshold_override ?? DEFAULT_OPTIONS.nliThreshold,
    fallbackEnabled: false
  };
  
  // If async mode requested and projectId provided, use async execution
  if (input.async && input.projectId) {
    return startAsyncAnalysis(input, options);
  }
  
  // Otherwise, perform synchronous analysis
  return performSynchronousAnalysis(input, options);
}

/**
 * Start asynchronous analysis and immediately return with task details
 */
async function startAsyncAnalysis(
  input: RequirementsInput, 
  options: AnalysisOptions
): Promise<AnalysisResponse> {
  try {
    // Calculate total comparisons (n * (n-1) / 2 for n requirements)
    const requirementsCount = Math.min(input.requirements.length, options.maxRequirements);
    const totalComparisons = (requirementsCount * (requirementsCount - 1)) / 2;
    
    // Create task entry in database
    const task = await storage.createRequirementComparisonTask({
      projectId: input.projectId!,
      status: 'pending',
      progress: 0,
      totalComparisons,
      completedComparisons: 0,
      isCurrent: true
    });
    
    // Start analysis in background without waiting for completion
    performAsyncAnalysis(input, options, task.id).catch(error => {
      console.error('Error in background analysis task:', error);
    });
    
    // Return immediate response with task information
    return {
      contradictions: [],
      processing_time_seconds: 0,
      comparisons_made: 0,
      nli_checks_made: 0,
      is_complete: false,
      task_id: task.id,
      project_id: input.projectId
    };
  } catch (error) {
    console.error('Error initiating asynchronous analysis:', error);
    throw error;
  }
}

/**
 * Perform analysis asynchronously in background without blocking
 */
async function performAsyncAnalysis(
  input: RequirementsInput, 
  options: AnalysisOptions,
  taskId: number
): Promise<void> {
  try {
    // Update task status to processing
    await storage.updateRequirementComparisonTask(taskId, {
      status: 'processing',
    });
    
    const startTime = Date.now();
    const projectId = input.projectId!;
    
    // Clear existing comparison results for this project
    await storage.deleteAllRequirementComparisons(projectId);
    
    // Fetch actual requirement objects if projectId is provided
    let requirements: Requirement[] = [];
    if (projectId) {
      requirements = await storage.getRequirementsByProject(projectId);
    }
    
    // Limit the number of requirements to avoid timeouts or rate limits
    const requirementTexts = input.requirements;
    const maxRequirements = options.maxRequirements;
    const actualRequirements = requirementTexts.length > maxRequirements
      ? requirementTexts.slice(0, maxRequirements)
      : requirementTexts;
    
    // Tracking variables
    let contradictions: ContradictionResult[] = [];
    let comparisons = 0;
    let nliChecks = 0;
    let apiErrors = 0;
    let completedComparisons = 0;
    
    // Compare each pair of requirements
    for (let i = 0; i < actualRequirements.length; i++) {
      const req1 = actualRequirements[i];
      
      // Skip very short requirements
      if (!req1 || req1.length < 10) {
        completedComparisons += (actualRequirements.length - i - 1);
        continue;
      }
      
      for (let j = i + 1; j < actualRequirements.length; j++) {
        const req2 = actualRequirements[j];
        comparisons++;
        
        // Skip very short requirements
        if (!req2 || req2.length < 10) {
          completedComparisons++;
          continue;
        }
        
        // Skip if too many API errors have occurred
        if (apiErrors > 5) {
          break;
        }
        
        try {
          // Update task with current requirements being compared
          let req1Id = requirements[i]?.id;
          let req2Id = requirements[j]?.id;
          
          await storage.updateRequirementComparisonTask(taskId, {
            currentRequirement1: req1Id,
            currentRequirement2: req2Id,
            completedComparisons,
            progress: Math.round((completedComparisons / (actualRequirements.length * (actualRequirements.length - 1) / 2)) * 100)
          });
          
          // First check similarity
          const similarity = await calculateSimilarity(req1, req2);
          
          // If the similarity is 0, it may be due to API error, so skip
          if (similarity === 0) {
            apiErrors++;
            completedComparisons++;
            continue;
          }
          
          // If similar enough, check for contradiction in both directions
          if (similarity >= options.similarityThreshold) {
            nliChecks += 2; // We're making 2 checks now
            
            // Check contradiction in both directions (req1->req2 and req2->req1)
            console.log(`Checking contradiction between requirements ${i} and ${j}`);
            console.log(`Requirement 1: ${req1.substring(0, 50)}...`);
            console.log(`Requirement 2: ${req2.substring(0, 50)}...`);
            
            // Use HuggingFace for contradiction detection
            const modelResult = await detectContradictionWithHuggingFace(req1, req2);
            const contradictionScore = modelResult.contradiction || 0;
            const modelUsed = 'huggingface';
            
            console.log(`Contradiction score: ${contradictionScore.toFixed(3)} using ${modelUsed}`);
            
            // If contradiction score is high enough, add to results
            if (contradictionScore >= options.nliThreshold) {
              console.log(`Found contradiction between requirements ${i} and ${j} with score ${contradictionScore.toFixed(3)}`);
              
              const contradiction: ContradictionResult = {
                requirement1: { index: i, text: req1, id: req1Id },
                requirement2: { index: j, text: req2, id: req2Id },
                similarity_score: similarity,
                nli_contradiction_score: contradictionScore,
                model_used: modelUsed
              };
              
              contradictions.push(contradiction);
              
              // Persist the contradiction in the database
              if (projectId && req1Id && req2Id) {
                await storage.createRequirementComparison({
                  projectId,
                  requirementId1: req1Id,
                  requirementId2: req2Id,
                  requirementText1: req1,
                  requirementText2: req2,
                  similarityScore: Math.round(similarity * 100),
                  nliContradictionScore: Math.round(contradictionScore * 100),
                  isContradiction: true
                });
              }
            } else if (projectId && req1Id && req2Id) {
              // Store the non-contradiction result as well
              await storage.createRequirementComparison({
                projectId,
                requirementId1: req1Id,
                requirementId2: req2Id,
                requirementText1: req1,
                requirementText2: req2,
                similarityScore: Math.round(similarity * 100),
                nliContradictionScore: Math.round(contradictionScore * 100),
                isContradiction: false
              });
            }
          }
          
          // Update progress
          completedComparisons++;
          const progress = Math.round((completedComparisons / (actualRequirements.length * (actualRequirements.length - 1) / 2)) * 100);
          
          await storage.updateRequirementComparisonTask(taskId, {
            completedComparisons,
            progress
          });
          
        } catch (error) {
          console.error(`Error analyzing requirements ${i} and ${j}:`, error);
          apiErrors++;
          completedComparisons++;
          // Continue with other comparisons if one fails
        }
      }
      
      // If too many API errors, stop the analysis
      if (apiErrors > 5) {
        console.log(`Stopping analysis after encountering ${apiErrors} API errors`);
        break;
      }
    }
    
    const processingTime = (Date.now() - startTime) / 1000;
    
    // Mark task as completed
    await storage.updateRequirementComparisonTask(taskId, {
      status: 'completed',
      completedAt: new Date().toISOString(),
      progress: 100,
      completedComparisons,
      error: apiErrors > 0 ? `Encountered ${apiErrors} API errors during analysis` : undefined
    });
    
    console.log(`Async analysis complete: Found ${contradictions.length} potential contradictions`);
    console.log(`Made ${comparisons} comparisons and ${nliChecks} NLI checks in ${processingTime.toFixed(2)} seconds`);
  } catch (error) {
    console.error('Error in async contradiction analysis:', error);
    
    // Mark task as failed
    await storage.updateRequirementComparisonTask(taskId, {
      status: 'failed',
      completedAt: new Date().toISOString(),
      error: `Analysis failed: ${error.message || 'Unknown error'}`
    });
  }
}

/**
 * Perform synchronous analysis and wait for results
 */
async function performSynchronousAnalysis(
  input: RequirementsInput, 
  options: AnalysisOptions
): Promise<AnalysisResponse> {
  const startTime = Date.now();
  const requirements = input.requirements;
  
  // Limit the number of requirements to avoid timeouts or rate limits
  const maxRequirements = options.maxRequirements;
  const actualRequirements = requirements.length > maxRequirements 
    ? requirements.slice(0, maxRequirements) 
    : requirements;
  
  if (requirements.length > maxRequirements) {
    console.log(`Limiting analysis to first ${maxRequirements} requirements out of ${requirements.length} total`);
  }
  
  const contradictions: ContradictionResult[] = [];
  let comparisons = 0;
  let nliChecks = 0;
  let apiErrors = 0;
  
  // Compare each pair of requirements
  for (let i = 0; i < actualRequirements.length; i++) {
    const req1 = actualRequirements[i];
    
    // Skip very short requirements
    if (!req1 || req1.length < 10) continue;
    
    for (let j = i + 1; j < actualRequirements.length; j++) {
      const req2 = actualRequirements[j];
      comparisons++;
      
      // Skip very short requirements
      if (!req2 || req2.length < 10) continue;
      
      // Skip if too many API errors have occurred
      if (apiErrors > 5) {
        console.log(`Stopping analysis after encountering ${apiErrors} API errors`);
        break;
      }
      
      try {
        // First check similarity
        const similarity = await calculateSimilarity(req1, req2);
        
        // If the similarity is 0, it may be due to API error, so skip
        if (similarity === 0) {
          apiErrors++;
          continue;
        }
        
        // If similar enough, check for contradiction in both directions
        if (similarity >= options.similarityThreshold) {
          nliChecks += 1;
          
          // Check contradiction
          console.log(`Checking contradiction between requirements ${i} and ${j}`);
          console.log(`Requirement 1: ${req1.substring(0, 50)}...`);
          console.log(`Requirement 2: ${req2.substring(0, 50)}...`);
          
          // Use HuggingFace for contradiction detection
          const modelResult = await detectContradictionWithHuggingFace(req1, req2);
          const contradictionScore = modelResult.contradiction || 0;
          const modelUsed = 'huggingface';
          
          console.log(`Contradiction score: ${contradictionScore.toFixed(3)} using ${modelUsed}`);
          
          // If contradiction score is high enough, add to results
          if (contradictionScore >= options.nliThreshold) {
            console.log(`Found contradiction between requirements ${i} and ${j} with score ${contradictionScore.toFixed(3)}`);
            
            contradictions.push({
              requirement1: { index: i, text: req1 },
              requirement2: { index: j, text: req2 },
              similarity_score: similarity,
              nli_contradiction_score: contradictionScore,
              model_used: modelUsed
            });
          }
        }
      } catch (error) {
        console.error(`Error analyzing requirements ${i} and ${j}:`, error);
        apiErrors++;
        // Continue with other comparisons if one fails
      }
    }
    
    // If too many API errors, stop the analysis
    if (apiErrors > 5) {
      console.log(`Stopping analysis after encountering ${apiErrors} API errors`);
      break;
    }
  }
  
  const processingTime = (Date.now() - startTime) / 1000;
  
  return {
    contradictions,
    processing_time_seconds: processingTime,
    comparisons_made: comparisons,
    nli_checks_made: nliChecks,
    errors: apiErrors > 0 ? `Encountered ${apiErrors} API errors during analysis` : undefined,
    is_complete: true
  };
}

/**
 * Calculate semantic similarity between two texts using HuggingFace
 * @returns Similarity score between 0 and 1
 */
async function calculateSimilarity(text1: string, text2: string): Promise<number> {
  try {
    // Prepare the request data for the similarity model
    const data = {
      inputs: {
        source_sentence: text1,
        sentences: [text2]
      }
    };
    
    // Make the request to the Hugging Face API
    const response = await makeHuggingFaceRequest(
      `https://api-inference.huggingface.co/models/${SIMILARITY_MODEL}`,
      data
    );
    
    // The response should be an array of similarity scores
    if (Array.isArray(response) && response.length > 0) {
      return response[0];
    } else {
      console.error('Unexpected response from similarity model:', response);
      return 0;
    }
  } catch (error) {
    console.error('Error calculating similarity:', error);
    return 0;
  }
}



/**
 * Helper function to make a request to the Hugging Face API with improved retry logic
 */
async function makeHuggingFaceRequest(url: string, body: any, maxRetries = 3): Promise<any> {
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  
  if (!apiKey) {
    throw new Error('HuggingFace API key not found in environment');
  }
  
  let lastError;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Add delay between retries
      if (attempt > 0) {
        await new Promise(resolve => setTimeout(resolve, attempt * 1000));
      }
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body)
      });
      
      if (!response.ok) {
        throw new Error(`HuggingFace API returned status ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      lastError = error;
      console.error(`Attempt ${attempt + 1}/${maxRetries} failed:`, error.message);
    }
  }
  
  throw lastError || new Error('Failed to make request to HuggingFace API');
}

/**
 * Detect contradiction using HuggingFace's DeBERTa model
 */
async function detectContradictionWithHuggingFace(text1: string, text2: string): Promise<NLIResult> {
  try {
    // For DeBERTa-v3 the expected format is {"inputs": "premise\nhypothesis"}
    const result = await makeHuggingFaceRequest(
      `https://api-inference.huggingface.co/models/${NLI_MODEL}`,
      {
        inputs: `${text1}\n${text2}`,
      }
    );
    
    let contradictionScore = 0;
    
    // The model should return an array with entailment, neutral, and contradiction probabilities
    if (Array.isArray(result) && Array.isArray(result[0])) {
      // Find the contradiction score from the predictions
      // Format is typically: [{label: "contradiction", score: 0.X}, ...]
      const contradictionPrediction = result[0].find((item: any) => 
        item.label && item.label.toLowerCase() === 'contradiction'
      );
      
      if (contradictionPrediction && typeof contradictionPrediction.score === 'number') {
        contradictionScore = contradictionPrediction.score;
      }
    }
    
    return {
      contradiction: contradictionScore,
      provider: 'huggingface'
    };
  } catch (error) {
    console.error('Error in HuggingFace NLI call:', error);
    throw error;
  }
}



/**
 * Get the status of an ongoing or completed contradiction analysis task
 */
export async function getContradictionAnalysisStatus(taskId: number): Promise<ComparisonTaskStatus | null> {
  try {
    const task = await storage.getCurrentRequirementComparisonTask(taskId);
    
    if (!task) {
      return null;
    }
    
    // Convert to API response format
    return {
      id: task.id,
      projectId: task.projectId,
      status: task.status as 'pending' | 'processing' | 'completed' | 'failed',
      progress: task.progress,
      totalComparisons: task.totalComparisons,
      completedComparisons: task.completedComparisons,
      currentRequirement1: task.currentRequirement1 || undefined,
      currentRequirement2: task.currentRequirement2 || undefined,
      error: task.error || undefined,
      startedAt: task.startedAt.toISOString(),
      completedAt: task.completedAt ? task.completedAt.toISOString() : undefined,
      // Add stale check by comparing latest requirement update time with task completion time
      is_stale: await checkIfResultsAreStale(task.projectId, task.completedAt)
    };
  } catch (error) {
    console.error('Error getting contradiction analysis status:', error);
    return null;
  }
}

/**
 * Check if analysis results are stale due to requirements being updated since analysis
 */
async function checkIfResultsAreStale(projectId: number, completedAt?: Date): Promise<boolean> {
  if (!completedAt) {
    return false; // If analysis not completed, results can't be stale
  }
  
  try {
    // Get all requirements for this project
    const requirements = await storage.getRequirementsByProject(projectId);
    
    // Check if any requirements were updated after the analysis completed
    return requirements.some(req => req.updatedAt > completedAt);
  } catch (error) {
    console.error('Error checking if results are stale:', error);
    return false;
  }
}

/**
 * Get all stored contradiction analysis results for a project
 */
export async function getStoredContradictionResults(projectId: number): Promise<AnalysisResponse> {
  try {
    // Get all stored contradictions
    const storedComparisons = await storage.getRequirementComparisons(projectId);
    
    // Get current task if any
    const currentTask = await storage.getCurrentRequirementComparisonTask(projectId);
    
    // Filter only the contradictions
    const contradictions = storedComparisons
      .filter(comp => comp.isContradiction)
      .map(comp => ({
        requirement1: {
          id: comp.requirementId1,
          index: -1, // We don't store original index
          text: comp.requirementText1
        },
        requirement2: {
          id: comp.requirementId2,
          index: -1, // We don't store original index
          text: comp.requirementText2
        },
        similarity_score: comp.similarityScore / 100, // Convert back to 0-1 scale
        nli_contradiction_score: comp.nliContradictionScore / 100 // Convert back to 0-1 scale
      }));
    
    const isComplete = currentTask?.status === 'completed';
    const taskId = currentTask?.id;
    
    return {
      contradictions,
      processing_time_seconds: 0, // Not tracked for stored results
      comparisons_made: storedComparisons.length,
      nli_checks_made: storedComparisons.length,
      is_complete: isComplete,
      task_id: taskId,
      project_id: projectId
    };
  } catch (error) {
    console.error('Error getting stored contradiction results:', error);
    throw error;
  }
}