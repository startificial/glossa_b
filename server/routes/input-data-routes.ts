/**
 * Input Data Routes
 * 
 * This module handles all API routes related to input data,
 * including file uploads, processing, and retrieving input data.
 */
import express from 'express';
import { inputDataController } from '../controllers/input-data-controller';
import { isAuthenticated } from '../middleware/auth';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';

const router = express.Router();

// Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Create the uploads directory if it doesn't exist
    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate a unique filename with original extension
    const uniqueSuffix = crypto.randomBytes(16).toString('hex');
    const originalExt = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${originalExt}`);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { 
    fileSize: 300 * 1024 * 1024 // 300MB size limit to ensure we can handle files of at least 150MB
  }
});

// Apply authentication middleware to all routes
router.use(isAuthenticated);

// GET /api/projects/:projectId/input-data - Get all input data for a project
router.get('/projects/:projectId/input-data', inputDataController.getInputDataForProject);

// POST /api/projects/:projectId/input-data - Upload and create a new input data item
router.post('/projects/:projectId/input-data', upload.single('file'), inputDataController.createInputData);

// POST /api/input-data/:inputDataId/process - Process an existing input data item
router.post('/input-data/:inputDataId/process', inputDataController.processInputData);

// POST /api/input-data/:inputDataId/expert-review - Generate expert review for a given input data
router.post('/input-data/:inputDataId/expert-review', inputDataController.generateExpertReview);

// POST /api/input-data/:inputDataId/pdf-summary - Generate PDF summary for a given input data
router.post('/input-data/:inputDataId/pdf-summary', inputDataController.generatePdfSummary);

/**
 * Register input data routes with the Express application
 * @param app Express application instance
 */
export function registerInputDataRoutes(app: express.Express): void {
  app.use('/api', router);
}

export default router;