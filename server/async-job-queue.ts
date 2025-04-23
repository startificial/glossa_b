/**
 * Async Job Queue System
 * 
 * This module provides a memory-efficient way to handle resource-intensive
 * operations like PDF processing as background jobs, preventing memory issues
 * in the main application thread.
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { EventEmitter } from 'events';
import { fork, type ChildProcess } from 'child_process';

// Define job types
export enum JobType {
  PDF_PROCESSING = 'pdf_processing',
  LARGE_FILE_PROCESSING = 'large_file_processing',
  IMAGE_PROCESSING = 'image_processing',
  AUDIO_PROCESSING = 'audio_processing',
  VIDEO_PROCESSING = 'video_processing',
  BATCH_OPERATION = 'batch_operation',
}

// Job status enum
export enum JobStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

// Job priority levels
export enum JobPriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
  CRITICAL = 3,
}

// Job definition interface
export interface Job {
  id: string;
  type: JobType;
  status: JobStatus;
  data: any;
  priority: JobPriority;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  progress?: number;
  result?: any;
  userId?: number;
  projectId?: number;
}

// Job result callback type
type JobResultCallback = (error: Error | null, result?: any) => void;

// Central event emitter for job events
const jobEvents = new EventEmitter();

// Set max listeners to prevent memory leaks
jobEvents.setMaxListeners(100);

// Store active worker processes
const activeWorkers: Map<string, ChildProcess> = new Map();

// In-memory job queue (could be replaced with Redis for production)
const jobQueue: Job[] = [];
const jobCallbacks: Map<string, JobResultCallback> = new Map();
const jobResults: Map<string, any> = new Map();
let isProcessing = false;

// Maximum concurrent jobs
const MAX_CONCURRENT_JOBS = 2;

/**
 * Create a new job and add it to the queue
 * @param type Job type
 * @param data Job data
 * @param priority Job priority
 * @param userId Optional user ID
 * @param projectId Optional project ID
 * @returns Job ID
 */
export function createJob(
  type: JobType, 
  data: any, 
  priority: JobPriority = JobPriority.NORMAL,
  userId?: number,
  projectId?: number
): string {
  // Generate a unique job ID
  const id = `job_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  
  // Create job object
  const job: Job = {
    id,
    type,
    status: JobStatus.PENDING,
    data,
    priority,
    createdAt: new Date(),
    userId,
    projectId,
  };
  
  // Add to queue
  jobQueue.push(job);
  
  // Sort queue by priority (higher priority first)
  jobQueue.sort((a, b) => b.priority - a.priority);
  
  // Emit job created event
  jobEvents.emit('job:created', job);
  
  // Start processing if not already running
  if (!isProcessing) {
    processNextJobs();
  }
  
  return id;
}

/**
 * Process next jobs in the queue
 */
async function processNextJobs() {
  if (isProcessing) return;
  
  isProcessing = true;
  
  // Count currently running jobs
  const runningJobs = Array.from(activeWorkers.values()).filter(worker => worker && !worker.killed);
  const availableSlots = MAX_CONCURRENT_JOBS - runningJobs.length;
  
  if (availableSlots <= 0) {
    isProcessing = false;
    return;
  }
  
  // Get next pending jobs based on available slots
  const pendingJobs = jobQueue.filter(job => job.status === JobStatus.PENDING);
  
  if (pendingJobs.length === 0) {
    isProcessing = false;
    return;
  }
  
  // Process up to available slots
  const jobsToProcess = pendingJobs.slice(0, availableSlots);
  
  for (const job of jobsToProcess) {
    // Update job status
    job.status = JobStatus.PROCESSING;
    job.startedAt = new Date();
    
    // Emit job started event
    jobEvents.emit('job:started', job);
    
    // Process job in a separate worker process to prevent memory issues
    processJobInWorker(job);
  }
  
  isProcessing = false;
}

/**
 * Process a job in a separate worker process
 * @param job Job to process
 */
function processJobInWorker(job: Job) {
  try {
    // Create a temporary file to store job data
    const jobDataPath = path.join(os.tmpdir(), `job-${job.id}.json`);
    fs.writeFileSync(jobDataPath, JSON.stringify(job), 'utf8');
    
    // Launch worker process
    const workerPath = path.join(__dirname, 'job-worker.js');
    const worker = fork(workerPath, [jobDataPath], {
      // Increase memory limit for large file processing
      execArgv: ['--max-old-space-size=3072'],
      // Set environment variables
      env: {
        ...process.env,
        JOB_ID: job.id,
        JOB_TYPE: job.type,
      },
    });
    
    // Store worker reference
    activeWorkers.set(job.id, worker);
    
    // Handle worker messages
    worker.on('message', (message: any) => {
      if (message.type === 'progress') {
        // Update job progress
        job.progress = message.progress;
        jobEvents.emit('job:progress', job);
      } else if (message.type === 'completed') {
        // Job completed successfully
        job.status = JobStatus.COMPLETED;
        job.completedAt = new Date();
        job.result = message.result;
        
        // Store result
        jobResults.set(job.id, message.result);
        
        // Call callback if registered
        const callback = jobCallbacks.get(job.id);
        if (callback) {
          callback(null, message.result);
          jobCallbacks.delete(job.id);
        }
        
        // Clean up
        activeWorkers.delete(job.id);
        cleanupJob(job.id, jobDataPath);
        
        // Emit job completed event
        jobEvents.emit('job:completed', job);
        
        // Process next jobs
        processNextJobs();
      } else if (message.type === 'failed') {
        // Job failed
        job.status = JobStatus.FAILED;
        job.completedAt = new Date();
        job.error = message.error;
        
        // Call callback if registered
        const callback = jobCallbacks.get(job.id);
        if (callback) {
          callback(new Error(message.error));
          jobCallbacks.delete(job.id);
        }
        
        // Clean up
        activeWorkers.delete(job.id);
        cleanupJob(job.id, jobDataPath);
        
        // Emit job failed event
        jobEvents.emit('job:failed', job);
        
        // Process next jobs
        processNextJobs();
      }
    });
    
    // Handle worker exit
    worker.on('exit', (code) => {
      if (job.status === JobStatus.PROCESSING) {
        // Worker exited unexpectedly
        job.status = JobStatus.FAILED;
        job.completedAt = new Date();
        job.error = `Worker process exited with code ${code}`;
        
        // Call callback if registered
        const callback = jobCallbacks.get(job.id);
        if (callback) {
          callback(new Error(`Worker process exited with code ${code}`));
          jobCallbacks.delete(job.id);
        }
        
        // Clean up
        activeWorkers.delete(job.id);
        cleanupJob(job.id, jobDataPath);
        
        // Emit job failed event
        jobEvents.emit('job:failed', job);
        
        // Process next jobs
        processNextJobs();
      }
    });
    
    // Handle worker error
    worker.on('error', (error) => {
      // Worker encountered an error
      job.status = JobStatus.FAILED;
      job.completedAt = new Date();
      job.error = error.message;
      
      // Call callback if registered
      const callback = jobCallbacks.get(job.id);
      if (callback) {
        callback(error);
        jobCallbacks.delete(job.id);
      }
      
      // Clean up
      activeWorkers.delete(job.id);
      cleanupJob(job.id, jobDataPath);
      
      // Emit job failed event
      jobEvents.emit('job:failed', job);
      
      // Process next jobs
      processNextJobs();
    });
  } catch (error: any) {
    // Error starting worker
    job.status = JobStatus.FAILED;
    job.completedAt = new Date();
    job.error = error.message;
    
    // Call callback if registered
    const callback = jobCallbacks.get(job.id);
    if (callback) {
      callback(error);
      jobCallbacks.delete(job.id);
    }
    
    // Emit job failed event
    jobEvents.emit('job:failed', job);
    
    // Process next jobs
    processNextJobs();
  }
}

/**
 * Clean up job data
 * @param jobId Job ID
 * @param jobDataPath Path to job data file
 */
function cleanupJob(jobId: string, jobDataPath: string) {
  try {
    // Remove job data file
    if (fs.existsSync(jobDataPath)) {
      fs.unlinkSync(jobDataPath);
    }
    
    // Remove job from queue if completed or failed
    const jobIndex = jobQueue.findIndex(job => job.id === jobId);
    if (jobIndex !== -1) {
      const job = jobQueue[jobIndex];
      if (job.status === JobStatus.COMPLETED || job.status === JobStatus.FAILED) {
        // Keep completed jobs in the queue for a while for status checks
        setTimeout(() => {
          const index = jobQueue.findIndex(j => j.id === jobId);
          if (index !== -1) {
            jobQueue.splice(index, 1);
          }
        }, 60 * 60 * 1000); // Remove after 1 hour
      }
    }
  } catch (error) {
    console.error(`Error cleaning up job ${jobId}:`, error);
  }
}

/**
 * Get a job by ID
 * @param jobId Job ID
 * @returns Job or null if not found
 */
export function getJob(jobId: string): Job | null {
  const job = jobQueue.find(job => job.id === jobId);
  return job || null;
}

/**
 * Get job status
 * @param jobId Job ID
 * @returns Job status or null if job not found
 */
export function getJobStatus(jobId: string): JobStatus | null {
  const job = getJob(jobId);
  return job ? job.status : null;
}

/**
 * Get job result
 * @param jobId Job ID
 * @returns Job result or null if job not found or not completed
 */
export function getJobResult(jobId: string): any | null {
  return jobResults.get(jobId) || null;
}

/**
 * Register a callback for job completion
 * @param jobId Job ID
 * @param callback Callback function
 * @returns True if job exists and callback registered, false otherwise
 */
export function onJobComplete(jobId: string, callback: JobResultCallback): boolean {
  const job = getJob(jobId);
  
  if (!job) {
    return false;
  }
  
  if (job.status === JobStatus.COMPLETED) {
    // Job already completed, call callback immediately
    callback(null, job.result);
    return true;
  } else if (job.status === JobStatus.FAILED) {
    // Job already failed, call callback immediately with error
    callback(new Error(job.error || 'Job failed'));
    return true;
  }
  
  // Register callback for future completion
  jobCallbacks.set(jobId, callback);
  return true;
}

/**
 * Cancel a job
 * @param jobId Job ID
 * @returns True if job was cancelled, false otherwise
 */
export function cancelJob(jobId: string): boolean {
  const job = getJob(jobId);
  
  if (!job || job.status !== JobStatus.PENDING) {
    return false;
  }
  
  // Update job status
  job.status = JobStatus.CANCELLED;
  
  // Remove callback if registered
  jobCallbacks.delete(jobId);
  
  // Emit job cancelled event
  jobEvents.emit('job:cancelled', job);
  
  return true;
}

/**
 * Subscribe to job events
 * @param eventType Event type
 * @param callback Callback function
 */
export function subscribeToJobEvents(
  eventType: 'job:created' | 'job:started' | 'job:progress' | 'job:completed' | 'job:failed' | 'job:cancelled',
  callback: (job: Job) => void
): void {
  jobEvents.on(eventType, callback);
}

/**
 * Unsubscribe from job events
 * @param eventType Event type
 * @param callback Callback function
 */
export function unsubscribeFromJobEvents(
  eventType: 'job:created' | 'job:started' | 'job:progress' | 'job:completed' | 'job:failed' | 'job:cancelled',
  callback: (job: Job) => void
): void {
  jobEvents.off(eventType, callback);
}

// Start processing jobs
processNextJobs();

// Export job event emitter
export { jobEvents };