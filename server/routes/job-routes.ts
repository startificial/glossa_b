/**
 * Job API Routes
 * 
 * These endpoints allow clients to create, monitor, and retrieve results from
 * asynchronous jobs for memory-intensive operations like PDF processing.
 */

import express, { Request, Response, NextFunction } from 'express';
import { 
  createJob, 
  getJob, 
  getJobStatus, 
  getJobResult, 
  cancelJob, 
  JobType, 
  JobPriority, 
  JobStatus 
} from '../async-job-queue';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// Middleware to ensure user is authenticated
function isAuthenticated(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (req.session && req.session.userId) {
    return next();
  }
  return res.status(401).json({ message: "Unauthorized" });
}

router.use(isAuthenticated);

/**
 * Create a new job for PDF processing
 * POST /api/jobs/pdf-processing
 */
router.post('/pdf-processing', async (req, res) => {
  try {
    const { 
      filePath, 
      projectName, 
      fileName, 
      contentType = 'documentation', 
      reqPerChunk = 5, 
      isLargeFile = false,
      inputDataId 
    } = req.body;
    
    // Validate required parameters
    if (!filePath || !projectName || !fileName) {
      return res.status(400).json({ 
        error: 'Missing required parameters', 
        required: ['filePath', 'projectName', 'fileName'] 
      });
    }
    
    // Validate file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: `File not found: ${filePath}` });
    }
    
    // Get user and project info from the request
    const userId = req.user?.id;
    const projectId = req.body.projectId;
    
    // Determine job priority
    const priority = isLargeFile 
      ? JobPriority.LOW // Process large files with lower priority
      : JobPriority.NORMAL;
    
    // Create job
    const jobId = createJob(
      JobType.PDF_PROCESSING,
      {
        filePath,
        projectName,
        fileName,
        contentType,
        reqPerChunk,
        allowLargeFiles: isLargeFile,
        inputDataId
      },
      priority,
      userId,
      projectId
    );
    
    // Return job details
    return res.status(202).json({
      jobId,
      status: JobStatus.PENDING,
      message: 'PDF processing job created',
      statusEndpoint: `/api/jobs/${jobId}`
    });
  } catch (error: any) {
    console.error('Error creating PDF processing job:', error);
    return res.status(500).json({ error: error.message || 'Error creating job' });
  }
});

/**
 * Create a new job for large file processing
 * POST /api/jobs/large-file-processing
 */
router.post('/large-file-processing', async (req, res) => {
  try {
    const { 
      pdfText, 
      pdfPath, 
      projectName, 
      fileName, 
      contentType = 'documentation', 
      minRequirements = 5,
      inputDataId 
    } = req.body;
    
    // Validate required parameters
    if (!pdfText || !pdfPath || !projectName || !fileName) {
      return res.status(400).json({ 
        error: 'Missing required parameters', 
        required: ['pdfText', 'pdfPath', 'projectName', 'fileName'] 
      });
    }
    
    // Get user and project info from the request
    const userId = req.user?.id;
    const projectId = req.body.projectId;
    
    // Create job
    const jobId = createJob(
      JobType.LARGE_FILE_PROCESSING,
      {
        pdfText,
        pdfPath,
        projectName,
        fileName,
        contentType,
        minRequirements,
        inputDataId
      },
      JobPriority.LOW, // Large files always get low priority
      userId,
      projectId
    );
    
    // Return job details
    return res.status(202).json({
      jobId,
      status: JobStatus.PENDING,
      message: 'Large file processing job created',
      statusEndpoint: `/api/jobs/${jobId}`
    });
  } catch (error: any) {
    console.error('Error creating large file processing job:', error);
    return res.status(500).json({ error: error.message || 'Error creating job' });
  }
});

/**
 * Get job status
 * GET /api/jobs/:jobId
 */
router.get('/:jobId', (req, res) => {
  try {
    const { jobId } = req.params;
    
    // Get job
    const job = getJob(jobId);
    
    if (!job) {
      return res.status(404).json({ error: `Job not found: ${jobId}` });
    }
    
    // Check if user has access to this job
    const userId = req.user?.id;
    if (job.userId && job.userId !== userId) {
      return res.status(403).json({ error: 'Not authorized to access this job' });
    }
    
    // Return job status
    const response: any = {
      jobId: job.id,
      status: job.status,
      type: job.type,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      progress: job.progress
    };
    
    // Include error if job failed
    if (job.status === JobStatus.FAILED && job.error) {
      response.error = job.error;
    }
    
    // Include result if job completed
    if (job.status === JobStatus.COMPLETED) {
      response.resultEndpoint = `/api/jobs/${jobId}/result`;
    }
    
    return res.json(response);
  } catch (error: any) {
    console.error('Error getting job status:', error);
    return res.status(500).json({ error: error.message || 'Error getting job status' });
  }
});

/**
 * Get job result
 * GET /api/jobs/:jobId/result
 */
router.get('/:jobId/result', (req, res) => {
  try {
    const { jobId } = req.params;
    
    // Get job
    const job = getJob(jobId);
    
    if (!job) {
      return res.status(404).json({ error: `Job not found: ${jobId}` });
    }
    
    // Check if user has access to this job
    const userId = req.user?.id;
    if (job.userId && job.userId !== userId) {
      return res.status(403).json({ error: 'Not authorized to access this job' });
    }
    
    // Check job status
    if (job.status !== JobStatus.COMPLETED) {
      return res.status(400).json({ 
        error: 'Job result not available', 
        status: job.status,
        message: job.status === JobStatus.FAILED 
          ? job.error || 'Job failed'
          : `Job is ${job.status}`
      });
    }
    
    // Get job result
    const result = getJobResult(jobId);
    
    if (result === null) {
      return res.status(404).json({ error: 'Job result not found' });
    }
    
    return res.json(result);
  } catch (error: any) {
    console.error('Error getting job result:', error);
    return res.status(500).json({ error: error.message || 'Error getting job result' });
  }
});

/**
 * Cancel a job
 * DELETE /api/jobs/:jobId
 */
router.delete('/:jobId', (req, res) => {
  try {
    const { jobId } = req.params;
    
    // Get job
    const job = getJob(jobId);
    
    if (!job) {
      return res.status(404).json({ error: `Job not found: ${jobId}` });
    }
    
    // Check if user has access to this job
    const userId = req.user?.id;
    if (job.userId && job.userId !== userId) {
      return res.status(403).json({ error: 'Not authorized to access this job' });
    }
    
    // Check if job can be cancelled
    if (job.status !== JobStatus.PENDING) {
      return res.status(400).json({ 
        error: 'Job cannot be cancelled', 
        status: job.status,
        message: `Job is already ${job.status}`
      });
    }
    
    // Cancel job
    const cancelled = cancelJob(jobId);
    
    if (!cancelled) {
      return res.status(400).json({ error: 'Failed to cancel job' });
    }
    
    return res.json({ 
      message: 'Job cancelled successfully', 
      jobId,
      status: JobStatus.CANCELLED
    });
  } catch (error: any) {
    console.error('Error cancelling job:', error);
    return res.status(500).json({ error: error.message || 'Error cancelling job' });
  }
});

export default router;