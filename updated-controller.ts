/**
 * Input Data Controller
 * 
 * Handles operations related to input data, including file uploads,
 * processing, and retrieving input data for projects.
 */
import { Request, Response } from 'express';
import { storage } from '../storage';
import { logger } from '../utils/logger';
import { insertInputDataSchema } from '@shared/schema';
import { processTextFile as geminiProcessTextFile, generateRequirementsForFile, generateExpertReview } from '../gemini';
import { processPdfFile, validatePdf, extractTextFromPdf } from '../pdf-processor';
import { analyzePdf } from '../pdf-analyzer';
import { extractTextFromDocx, analyzeDocx } from '../stream-file-processor';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import VideoProcessor from '../video-processor';

/**
 * Controller for input data operations
 */
export class InputDataController {
  /**
   * Get all input data for a project
   * @param req Express request object
   * @param res Express response object
   */
  // Other methods remain the same, just changing specific instances of PDF processing

  /**
   * Process input data to generate requirements
   * @param req Express request object
   * @param res Express response object
   */
  async processInputData(req: Request, res: Response): Promise<Response> {
    try {
      const inputDataId = parseInt(req.params.inputDataId);
      
      if (isNaN(inputDataId)) {
        return res.status(400).json({ message: "Invalid input data ID" });
      }
      
      const inputData = await storage.getInputData(inputDataId);
      
      if (!inputData) {
        return res.status(404).json({ message: "Input data not found" });
      }
      
      if (inputData.status !== 'processed') {
        return res.status(400).json({ message: "Input data must be processed before generating requirements" });
      }
      
      // Get user information for activity logging
      let userId = req.session.userId;
      const user = await storage.getUserByUsername("demo");
      
      if (!user) {
        return res.status(401).json({ message: "Authorization error" });
      }
      
      // Get metadata
      let metadata = {};
      try {
        if (inputData.metadata) {
          metadata = typeof inputData.metadata === 'string' ? 
                    JSON.parse(inputData.metadata) : 
                    inputData.metadata;
        }
      } catch (error) {
        logger.error("Error parsing metadata:", error);
      }
      
      try {
        // Check if file exists
        if (!fs.existsSync(inputData.filePath)) {
          throw new Error("File not found on disk");
        }
        
        // Read file content
        let content;
        if (inputData.fileType === '.pdf') {
          // Use analyzePdf instead of extractTextFromPdf for more robust text extraction
          const analysisResult = await analyzePdf(inputData.filePath);
          content = analysisResult.text || '';
        } else if (inputData.fileType === '.txt' || inputData.fileType === '.md') {
          // Use streaming text processor for better memory efficiency
          try {
            // Import the stream file processor for text handling
            const { extractTextFromTxt } = await import("../stream-file-processor.js");
            
            // Process text with streaming support for large files
            const txtResult = await extractTextFromTxt(inputData.filePath);
            
            if (!txtResult.success) {
              throw new Error(txtResult.error || "Failed to read text from file");
            }
            
            content = txtResult.text;
          } catch (error) {
            logger.error("Error extracting text from file:", error);
            throw new Error("Could not read file content");
          }
        } else if (inputData.fileType === '.docx' || inputData.fileType === '.doc') {
          // Extract text from DOCX/DOC
          const docResult = await extractTextFromDocx(inputData.filePath);
          
          if (!docResult.success) {
            throw new Error(docResult.error || "Failed to extract text from document");
          }
          
          content = docResult.text;
        } else {
          return res.status(400).json({ message: "Unsupported file type for content extraction" });
        }
        
        // Validate content
        if (!content || content.trim().length < 10) {
          throw new Error("Extracted content is too short or empty");
        }
        
        // Get project for requirements generation
        const project = await storage.getProject(inputData.projectId);
        
        if (!project) {
          return res.status(404).json({ message: "Project not found" });
        }
        
        // Update input data status to processing
        await storage.updateInputData(inputData.id, {
          status: "processing"
        });
        
        // Process based on file type
        let requirements = [];
        
        // For text files, use the Gemini API with optional streaming
        if (inputData.fileType === '.txt' || inputData.fileType === '.md') {
          // Use the generateRequirementsFromText function from stream-file-processor for text files
          try {
            const { generateRequirementsFromText } = await import('../stream-file-processor.js');
            
            // Use the streaming-capable function
            requirements = await generateRequirementsFromText(
              inputData.filePath,
              inputData.name,
              project.name
            );
            
            logger.info(`Generated ${requirements.length} requirements from text file ${inputData.name}`);
          } catch (error) {
            logger.error("Error generating requirements from text:", error);
            throw error;
          }
        } else if (inputData.fileType === '.pdf') {
          // Use the same Gemini API as text files for PDF content
          try {
            // Generate requirements based on file content
            requirements = await generateRequirementsForFile(
              'pdf',
              inputData.name,
              project.name,
              inputData.filePath,
              'documentation',
              3, // numAnalyses: Use 3 perspectives for more comprehensive coverage
              5, // reqPerAnalysis: 5 requirements per perspective seems to be a good balance
              inputData.id
            );
            
            logger.info(`Generated ${requirements.length} requirements from PDF ${inputData.name}`);
          } catch (error) {
            logger.error("Error generating PDF requirements:", error);
            
            // Update status to error
            await storage.updateInputData(inputData.id, {
              status: "error",
              processingError: error instanceof Error ? error.message : "Unknown error processing PDF"
            });
            
            throw error;
          }
        } else if (inputData.fileType === '.docx' || inputData.fileType === '.doc') {
          // Use Gemini API for DOCX processing
          try {
            requirements = await generateRequirementsForFile(
              'document',
              inputData.name,
              project.name,
              inputData.filePath,
              'documentation',
              3,
              5,
              inputData.id
            );
            
            logger.info(`Generated ${requirements.length} requirements from document ${inputData.name}`);
          } catch (error) {
            logger.error("Error generating DOCX requirements:", error);
            
            // Update status to error
            await storage.updateInputData(inputData.id, {
              status: "error",
              processingError: error instanceof Error ? error.message : "Unknown error processing DOCX"
            });
            
            throw error;
          }
        } else {
          throw new Error(`Unsupported file type: ${inputData.fileType}`);
        }
        
        // Filter and cleanup requirements
        const validRequirements = requirements.filter(req => 
          req && 
          req.title && 
          req.description &&
          req.category &&
          req.priority
        );
        
        // Store requirements in database
        for (const req of validRequirements) {
          await storage.createRequirement({
            title: req.title,
            description: req.description,
            category: req.category,
            priority: req.priority,
            projectId: inputData.projectId,
            inputDataId: inputData.id,
            status: 'new'
          });
        }
        
        // Update input data status to complete
        await storage.updateInputData(inputData.id, {
          status: "processed"
        });
        
        // Create activity log
        await storage.createActivity({
          userId: user.id,
          projectId: inputData.projectId,
          type: "generated_requirements",
          description: `${user.username} generated requirements from input data: ${inputData.name}`,
          relatedEntityId: inputData.id
        });
        
        return res.status(200).json({ 
          message: "Requirements generated successfully", 
          count: validRequirements.length 
        });
      } catch (error) {
        logger.error("Error processing input data:", error);
        
        // Update input data status to error
        await storage.updateInputData(inputData.id, {
          status: "error",
          metadata: JSON.stringify({
            error: error instanceof Error ? error.message : "Unknown error"
          })
        });
        
        return res.status(500).json({ 
          message: "Error processing input data", 
          error: error instanceof Error ? error.message : "Unknown error" 
        });
      }
    } catch (error) {
      logger.error("Error in processInputData:", error);
      return res.status(500).json({ message: "Server error" });
    }
  }

  // Rest of the class methods remain unchanged
}