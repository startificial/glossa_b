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
  async getInputDataForProject(req: Request, res: Response): Promise<Response> {
    try {
      const projectId = parseInt(req.params.projectId);
      
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }
      
      const inputDataItems = await storage.getInputDataByProject(projectId);
      
      return res.json(inputDataItems);
    } catch (error) {
      logger.error("Error retrieving input data for project:", error);
      return res.status(500).json({ message: "Error retrieving input data" });
    }
  }

  /**
   * Upload and create a new input data item
   * @param req Express request object
   * @param res Express response object
   */
  async createInputData(req: Request, res: Response): Promise<Response> {
    try {
      const projectId = parseInt(req.params.projectId);
      
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }
      
      // Get file upload from multer
      const file = req.file;
      if (!file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      // Get user information
      let userId = req.session.userId;
      let user = null;
      
      if (userId) {
        user = await storage.getUser(userId);
      } else {
        // If no user in session, use demo user
        user = await storage.getUserByUsername("demo");
        if (!user) {
          user = await storage.getUserByUsername("glossa_admin");
        }
      }
      
      if (!user) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      // Insert input data record - add null/undefined checks
      const fileType = file && file.originalname ? path.extname(file.originalname).toLowerCase() : '';
      
      // Determine the type of file based on extension
      let fileContentType = "file";
      if (['.pdf'].includes(fileType)) {
        fileContentType = "pdf";
      } else if (['.docx', '.doc'].includes(fileType)) {
        fileContentType = "document";
      } else if (['.txt', '.md'].includes(fileType)) {
        fileContentType = "text";
      } else if (['.mp4', '.mov', '.webm'].includes(fileType)) {
        fileContentType = "video";
      }
      
      // Create input data record
      const inputData = await storage.createInputData({
        name: file.originalname,
        type: fileContentType,
        size: file.size,
        contentType: file.mimetype.length > 50 ? file.mimetype.substring(0, 50) : file.mimetype,
        projectId: projectId,
        status: "uploaded",
        filePath: file.path,
        fileType: fileType
      });
      
      // Create activity log for the upload
      await storage.createActivity({
        userId: user.id,
        projectId: projectId,
        type: "upload_input_data",
        description: `Uploaded input data: ${file.originalname}`,
        relatedEntityId: inputData.id
      });
      
      // Handle different file types
      let processingResult: any = null;
      let textContent = '';
      
      if (fileType === '.txt' || fileType === '.md') {
        // Process text files - use the same approach as DOCX for consistency
        try {
          // Import text analysis functions from our stream-file-processor
          const { extractTextFromTxt, analyzeTxt } = await import('../stream-file-processor.js');
          
          // First extract text content
          const extractedText = await extractTextFromTxt(file.path);
          
          if (!extractedText.success) {
            throw new Error(extractedText.error || 'Failed to extract text from file');
          }
          
          textContent = extractedText.text;
          
          // Analyze the text content like we do for DOCX files
          const analysisResult = await analyzeTxt(file.path);
          
          processingResult = {
            text: textContent,
            metadata: JSON.stringify(analysisResult.metadata || {}),
            context: analysisResult.context || {
              domain: "unknown",
              docType: "text document",
              keywords: [],
              hasRequirements: false
            },
            hasOcrText: false,
            pageCount: 1,
            isScanOrImage: false
          };
          
          logger.info(`Successfully analyzed text file: ${file.originalname} with ${textContent.length} characters ${extractedText.isStreaming ? '(streaming mode)' : ''}`);
        } catch (error) {
          logger.error("Error processing text file:", error);
          await storage.updateInputData(inputData.id, {
            status: "error",
            metadata: JSON.stringify({ error: error instanceof Error ? error.message : "Failed to process text file" })
          });
          return res.status(500).json({ message: "Error processing text file" });
        }
      } else if (fileType === '.pdf') {
        // Process PDF files
        const pdfInfo = await validatePdf(file.path);
        if (!pdfInfo.valid) {
          return res.status(400).json({ message: "Invalid PDF file" });
        }
        
        try {
          // Analyze the PDF content first, which also extracts text
          const analysisResult = await analyzePdf(file.path);
          
          // Get the extracted text from the analysis result
          textContent = analysisResult.text || '';
          
          processingResult = {
            text: textContent,
            metadata: JSON.stringify(analysisResult.metadata || {}),
            context: analysisResult.context || {
              domain: "unknown",
              docType: "PDF document",
              keywords: [],
              hasRequirements: false
            },
            hasOcrText: analysisResult.hasOcrText,
            pageCount: analysisResult.pageCount,
            isScanOrImage: analysisResult.isScanOrImage
          };
        } catch (error) {
          logger.error("Error processing PDF:", error);
          await storage.updateInputData(inputData.id, {
            status: "error",
            metadata: JSON.stringify({ error: "Failed to process PDF" })
          });
          return res.status(500).json({ message: "Error processing PDF file" });
        }
      } else if (fileType === '.docx' || fileType === '.doc') {
        // Process DOCX files
        try {
          // Extract text and analyze the DOCX document
          const extractedText = await extractTextFromDocx(file.path);
          
          if (!extractedText.success) {
            throw new Error(extractedText.error || 'Failed to extract text from document');
          }
          
          textContent = extractedText.text;
          
          // Analyze the document content
          const analysisResult = await analyzeDocx(file.path);
          
          processingResult = {
            text: textContent,
            metadata: JSON.stringify(analysisResult.metadata || {}),
            context: analysisResult.context || {
              domain: "unknown",
              docType: "DOCX document",
              keywords: [],
              hasRequirements: false
            },
            hasOcrText: false,
            pageCount: 1, // DOCX doesn't have pages in the same way PDFs do
            isScanOrImage: false
          };
        } catch (error) {
          logger.error("Error processing DOCX:", error);
          await storage.updateInputData(inputData.id, {
            status: "error",
            metadata: JSON.stringify({ error: error instanceof Error ? error.message : "Failed to process DOCX file" })
          });
          return res.status(500).json({ message: "Error processing DOCX file" });
        }
      } else if (fileType === '.mp4' || fileType === '.mov' || fileType === '.webm') {
        // Process video files
        // Create output directory for video processing
        const outputDir = path.join(process.cwd(), 'uploads', 'video-processing', inputData.id.toString());
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }
        
        const videoProcessor = new VideoProcessor(file.path, outputDir, inputData.id);
        
        try {
          // First get metadata for the video
          const metadata = await videoProcessor.getMetadata();
          
          // Detect scenes in the video
          const scenes = await videoProcessor.detectScenes(0.3, 0.5); // Default thresholds
          
          // Process scenes to generate thumbnails, clips, and transcripts
          const processedScenes = await videoProcessor.processScenes(scenes);
          
          // Combine all scene transcripts into a single text
          textContent = processedScenes.map(scene => scene.transcript || '').join('\n\n');
          
          // Get duration from metadata
          const duration = metadata?.format?.duration || 0;
          const format = metadata?.format?.format_name || 'unknown';
          
          processingResult = {
            text: textContent,
            metadata: JSON.stringify({
              duration: duration,
              format: format,
              sceneCount: scenes.length
            }),
            context: {
              domain: "video content",
              docType: "video",
              keywords: [],
              hasRequirements: false
            },
            hasOcrText: false,
            pageCount: 0,
            isScanOrImage: false
          };
        } catch (error) {
          logger.error("Error processing video:", error);
          await storage.updateInputData(inputData.id, {
            status: "error",
            metadata: JSON.stringify({ error: error instanceof Error ? error.message : "Failed to process video" })
          });
          return res.status(500).json({ message: "Error processing video file" });
        }
      } else {
        // Unsupported file type
        logger.warn(`Unsupported file type: ${fileType} for file: ${file.originalname}`);
        await storage.updateInputData(inputData.id, {
          status: "error",
          metadata: JSON.stringify({ error: `Unsupported file type: ${fileType}` })
        });
        return res.status(400).json({ message: `Unsupported file type: ${fileType}. Supported types include PDF, DOCX, TXT, and video formats.` });
      }
      
      // Update input data with processing results
      if (processingResult) {
        await storage.updateInputData(inputData.id, {
          status: "processed",
          metadata: processingResult.metadata
        });
        
        // No need to mark text files as processed immediately - we'll follow the normal flow
        // This ensures the UI displays processing status correctly
        
        // For DOCX, TXT, and PDF files, automatically start processing into requirements
        if (fileType === '.docx' || fileType === '.doc' || fileType === '.txt' || fileType === '.md' || fileType === '.pdf') {
          // Process asynchronously in the background
          (async () => {
            try {
              let fileTypeLabel = 'DOCX';
              if (fileType === '.txt' || fileType === '.md') {
                fileTypeLabel = 'text';
              } else if (fileType === '.pdf') {
                fileTypeLabel = 'PDF';
              }
              logger.info(`Auto-processing ${fileTypeLabel} file into requirements: ${file.originalname}`);
              
              // Update status to processing
              await storage.updateInputData(inputData.id, {
                status: "processing",
                metadata: JSON.stringify({ 
                  message: "Extracting text from document" 
                })
              });
              
              // Extract text based on file type
              let extractedText: { text: string; success?: boolean } = { text: '', success: true };
              
              if (fileType === '.docx' || fileType === '.doc') {
                extractedText = await extractTextFromDocx(file.path);
                if (!extractedText.success) {
                  throw new Error(extractedText.error || 'Failed to extract text from document');
                }
              } else if (fileType === '.txt' || fileType === '.md') {
                // For text files, use analyzeTxt to process everything
                try {
                  // Import both text extraction and analysis functions
                  const { extractTextFromTxt, analyzeTxt } = await import('../stream-file-processor.js');
                  
                  // First get the text using our streaming-capable handler
                  const txtResult = await extractTextFromTxt(file.path);
                  
                  if (!txtResult.success) {
                    throw new Error(txtResult.error || "Failed to read text file");
                  }
                  
                  // Store the extracted text
                  extractedText.text = txtResult.text;
                  
                  // Get the full analysis
                  const analysisResult = await analyzeTxt(file.path);
                  
                  // Add analysis metadata to the input data
                  await storage.updateInputData(inputData.id, {
                    metadata: JSON.stringify({ 
                      message: "Analyzing text content",
                      isStreaming: txtResult.isStreaming || false,
                      metadata: analysisResult.metadata || {},
                      context: analysisResult.context || {}
                    })
                  });
                  
                  // Add note about streaming mode
                  if (txtResult.isStreaming) {
                    await storage.updateInputData(inputData.id, {
                      metadata: JSON.stringify({ 
                        message: "Extracting text from document (streaming mode)",
                        streamingNote: "This file is being processed in streaming mode due to its large size."
                      })
                    });
                  }
                } catch (error) {
                  throw new Error(`Failed to analyze text file: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
              } else if (fileType === '.pdf') {
                // For PDF files, use the analyzer which includes better text extraction
                try {
                  // Use analyzePdf which handles text extraction more robustly
                  const analysisResult = await analyzePdf(file.path);
                  
                  // Use the text from the analysis result, which is more complete than simple extraction
                  extractedText.text = analysisResult.text || '';
                  
                  // Add analysis metadata to the input data
                  await storage.updateInputData(inputData.id, {
                    metadata: JSON.stringify({ 
                      message: "Analyzing PDF content",
                      metadata: analysisResult.metadata || {},
                      context: analysisResult.context || {},
                      pageCount: analysisResult.pageCount,
                      hasOcrText: analysisResult.hasOcrText
                    })
                  });
                  
                  logger.info(`Extracted ${extractedText.text.length} characters of text from PDF file for requirement generation`);
                } catch (error) {
                  throw new Error(`Failed to analyze PDF file: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
              }
              
              // Update status to generating requirements
              await storage.updateInputData(inputData.id, {
                status: "processing",
                metadata: JSON.stringify({ 
                  message: "Generating requirements",
                  textLength: extractedText.text.length
                })
              });
              
              // Get project name for context
              const project = await storage.getProject(projectId);
              const projectName = project ? project.name : 'Unknown Project';
              
              // Generate requirements based on file type
              let requirements = [];
              
              if (fileType === '.txt' || fileType === '.md') {
                // Use our more efficient streaming approach for text files
                // Import the function from stream-file-processor
                const { generateRequirementsFromText } = await import('../stream-file-processor.js');
                
                // Process with memory-efficient approach
                requirements = await generateRequirementsFromText(
                  file.path,
                  file.originalname,
                  projectName
                );
              } else {
                // For DOCX, use generateRequirementsForFile as before
                requirements = await generateRequirementsForFile(
                  extractedText.text || '', 
                  file && file.originalname ? file.originalname : 'document.docx'
                );
              }
              
              if (!requirements || !Array.isArray(requirements) || requirements.length === 0) {
                logger.warn(`No requirements generated from ${fileTypeLabel} file: ${file.originalname}`);
                
                // Update status to completed but with warning
                await storage.updateInputData(inputData.id, {
                  status: "completed",
                  metadata: JSON.stringify({ 
                    warning: "No requirements were extracted from this document" 
                  })
                });
                
                return;
              }
              
              // Create requirements in database
              let reqCounter = 1;
              for (const req of requirements) {
                const codeId = `REQ-${String(reqCounter++).padStart(3, '0')}`;
                
                await storage.createRequirement({
                  title: req.title || "Untitled Requirement",
                  description: req.description || "",
                  category: req.category || "functional",
                  priority: req.priority || "medium",
                  projectId: inputData.projectId,
                  inputDataId: inputData.id,
                  codeId,
                  source: file.originalname
                });
              }
              
              // Get file format based on file type
              let fileFormat = 'DOCX';
              if (fileType === '.txt' || fileType === '.md') {
                fileFormat = 'TEXT';
              } else if (fileType === '.pdf') {
                fileFormat = 'PDF';
              }
              
              // Update input data status
              await storage.updateInputData(inputData.id, {
                status: "completed",
                metadata: JSON.stringify({
                  textLength: extractedText.text.length,
                  format: fileFormat,
                  processingTime: new Date().toISOString(),
                  requirementsCount: requirements.length
                })
              });
              
              // Log activity
              await storage.createActivity({
                userId: user.id,
                projectId: inputData.projectId,
                type: "generated_requirements",
                description: `${user.username} generated requirements from ${file.originalname}`,
                relatedEntityId: inputData.id
              });
              
              logger.info(`Successfully auto-processed ${fileFormat} into ${requirements.length} requirements`);
            } catch (error) {
              logger.error(`Error auto-processing ${fileTypeLabel} into requirements:`, error);
              await storage.updateInputData(inputData.id, {
                status: "error",
                metadata: JSON.stringify({ 
                  error: error instanceof Error ? error.message : "Failed to process document into requirements" 
                })
              });
            }
          })();
        }
      }
      
      return res.status(201).json(inputData);
    } catch (error) {
      logger.error("Error creating input data:", error);
      return res.status(500).json({ message: "Error creating input data: " + (error instanceof Error ? error.message : String(error)) });
    }
  }

  /**
   * Process an existing input data item
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
          const extractedText = await extractTextFromPdf(inputData.filePath);
          content = extractedText.text;
        } else if (inputData.fileType === '.txt' || inputData.fileType === '.md') {
          // Use streaming text processor for better memory efficiency
          try {
            // Import the stream file processor for text handling
            const { extractTextFromTxt } = await import("../stream-file-processor.js");
            
            // Process text with streaming support for large files
            const txtResult = await extractTextFromTxt(inputData.filePath);
            
            if (!txtResult.success) {
              throw new Error(txtResult.error || "Failed to read text file");
            }
            
            content = txtResult.text;
            
            // Log streaming mode if it was used
            if (txtResult.isStreaming) {
              logger.info(`Processing large text file (${inputData.name}) in streaming mode`);
            }
          } catch (error) {
            logger.error("Error extracting text from text file:", error);
            throw new Error(`Failed to read text file: ${error instanceof Error ? error.message : "Unknown error"}`);
          }
        } else if (inputData.fileType === '.docx' || inputData.fileType === '.doc') {
          try {
            const extractedText = await extractTextFromDocx(inputData.filePath);
            if (!extractedText.success) {
              throw new Error(extractedText.error || 'Failed to extract text from document');
            }
            content = extractedText.text;
          } catch (error) {
            logger.error("Error extracting text from DOCX:", error);
            throw new Error("Failed to extract text from DOCX file");
          }
        } else {
          throw new Error(`Unsupported file type: ${inputData.fileType} for requirement generation. Supported types include PDF, DOCX, and TXT files.`);
        }
        
        // Use appropriate AI to generate requirements
        const requirements = await generateRequirementsForFile(content, inputData.name);
        
        if (!requirements || !Array.isArray(requirements) || requirements.length === 0) {
          await storage.updateInputData(inputData.id, {
            processingError: "No requirements generated"
          });
          return res.status(400).json({ message: "Could not generate requirements from this file" });
        }
        
        // Create requirements in the database
        const createdRequirements = [];
        
        for (const req of requirements) {
          // Prepare acceptance criteria
          let acceptanceCriteria = [];
          
          try {
            // Generate acceptance criteria
            if (req.description && req.description.length > 0) {
              // Use a simpler approach for now since generateAcceptanceCriteria is not available
              // Default to empty array - this can be enhanced later
              acceptanceCriteria = [];
            }
          } catch (critError) {
            logger.error("Error generating acceptance criteria:", critError);
          }
          
          // Create requirement
          const createdReq = await storage.createRequirement({
            title: req.title,
            description: req.description,
            category: req.category || "functional",
            priority: req.priority || "medium",
            projectId: inputData.projectId,
            inputDataId: inputData.id,
            acceptanceCriteria: acceptanceCriteria
          });
          
          createdRequirements.push(createdReq);
        }
        
        // Update input data
        await storage.updateInputData(inputData.id, {
          status: "requirements_generated"
        });
        
        // Log the activity
        await storage.createActivity({
          userId: user.id,
          projectId: inputData.projectId,
          type: "generate_requirements",
          description: `Generated ${createdRequirements.length} requirements from ${inputData.name}`,
          relatedEntityId: inputData.id
        });
        
        return res.json({
          message: `Generated ${createdRequirements.length} requirements`,
          requirements: createdRequirements
        });
      } catch (error) {
        logger.error("Error processing input data content:", error);
        await storage.updateInputData(inputData.id, {
          processingError: error.message || "Unknown error during processing"
        });
        return res.status(500).json({ message: "Error processing input data content" });
      }
    } catch (error) {
      logger.error("Error processing input data:", error);
      return res.status(500).json({ message: "Error processing input data" });
    }
  }

  /**
   * Generate expert review for a given input data
   * @param req Express request object
   * @param res Express response object
   */
  async generateExpertReview(req: Request, res: Response): Promise<Response> {
    try {
      const inputDataId = parseInt(req.params.inputDataId);
      
      if (isNaN(inputDataId)) {
        return res.status(400).json({ message: "Invalid input data ID" });
      }
      
      const inputData = await storage.getInputData(inputDataId);
      
      if (!inputData) {
        return res.status(404).json({ message: "Input data not found" });
      }
      
      if (inputData.status !== 'processed' && inputData.status !== 'requirements_generated') {
        return res.status(400).json({ message: "Input data must be processed before generating expert review" });
      }
      
      try {
        // Check if file exists
        if (!fs.existsSync(inputData.filePath)) {
          throw new Error("File not found on disk");
        }
        
        // Read file content
        let content;
        if (inputData.fileType === '.pdf') {
          const extractedText = await extractTextFromPdf(inputData.filePath);
          content = extractedText.text;
        } else if (inputData.fileType === '.txt' || inputData.fileType === '.md') {
          // Use streaming text processor for better memory efficiency
          try {
            // Import the stream file processor for text handling
            const { extractTextFromTxt } = await import("../stream-file-processor.js");
            
            // Process text with streaming support for large files
            const txtResult = await extractTextFromTxt(inputData.filePath);
            
            if (!txtResult.success) {
              throw new Error(txtResult.error || "Failed to read text file");
            }
            
            content = txtResult.text;
            
            // Log streaming mode if it was used
            if (txtResult.isStreaming) {
              logger.info(`Processing large text file (${inputData.name}) in streaming mode`);
            }
          } catch (error) {
            logger.error("Error extracting text from text file:", error);
            throw new Error(`Failed to read text file: ${error instanceof Error ? error.message : "Unknown error"}`);
          }
        } else if (inputData.fileType === '.docx' || inputData.fileType === '.doc') {
          try {
            const extractedText = await extractTextFromDocx(inputData.filePath);
            if (!extractedText.success) {
              throw new Error(extractedText.error || 'Failed to extract text from document');
            }
            content = extractedText.text;
          } catch (error) {
            logger.error("Error extracting text from DOCX for expert review:", error);
            throw new Error("Failed to extract text from DOCX file for expert review");
          }
        } else {
          throw new Error(`Unsupported file type: ${inputData.fileType} for expert review. Supported types include PDF, DOCX, and TXT files.`);
        }
        
        // Get all requirements for this input data
        const allRequirements = await storage.getRequirementsByInputData(inputDataId);
        
        // Generate expert review
        const review = await generateExpertReview(content, inputData.name, allRequirements);
        
        if (!review) {
          await storage.updateInputData(inputData.id, {
            processingError: "Failed to generate expert review"
          });
          return res.status(400).json({ message: "Could not generate expert review" });
        }
        
        // Update input data
        await storage.updateInputData(inputData.id, {
          status: "review_generated",
          metadata: JSON.stringify({ ...JSON.parse(inputData.metadata as string), expertReview: review })
        });
        
        // Update requirements with expert review
        for (const req of allRequirements) {
          const reqReview = review.requirementReviews.find(r => r.requirementId === req.id);
          if (reqReview) {
            await storage.updateRequirement(req.id, {
              expertReview: reqReview
            });
          }
        }
        
        return res.json({
          message: "Generated expert review",
          review: review
        });
      } catch (error) {
        logger.error("Error generating expert review:", error);
        await storage.updateInputData(inputData.id, {
          processingError: error.message || "Unknown error during expert review generation"
        });
        return res.status(500).json({ message: "Error generating expert review" });
      }
    } catch (error) {
      logger.error("Error processing expert review request:", error);
      return res.status(500).json({ message: "Error processing expert review request" });
    }
  }

  /**
   * Generate PDF summary for a given input data
   * @param req Express request object
   * @param res Express response object
   */
  async generatePdfSummary(req: Request, res: Response): Promise<Response> {
    try {
      const inputDataId = parseInt(req.params.inputDataId);
      
      if (isNaN(inputDataId)) {
        return res.status(400).json({ message: "Invalid input data ID" });
      }
      
      const inputData = await storage.getInputData(inputDataId);
      
      if (!inputData) {
        return res.status(404).json({ message: "Input data not found" });
      }
      
      if (inputData.fileType !== '.pdf') {
        return res.status(400).json({ message: "Only PDF files can be summarized" });
      }
      
      try {
        // Check if file exists
        if (!fs.existsSync(inputData.filePath)) {
          throw new Error("File not found on disk");
        }
        
        // Process the PDF for summary
        const summaryResult = await processPdfFile(inputData.filePath);
        
        if (!summaryResult) {
          await storage.updateInputData(inputData.id, {
            processingError: "Failed to generate PDF summary"
          });
          return res.status(400).json({ message: "Could not generate PDF summary" });
        }
        
        // Update input data with summary
        await storage.updateInputData(inputData.id, {
          status: "summary_generated",
          metadata: JSON.stringify({ 
            ...JSON.parse(inputData.metadata as string), 
            summary: summaryResult.summary,
            format: summaryResult.format
          })
        });
        
        return res.json({
          message: "Generated PDF summary",
          summary: summaryResult
        });
      } catch (error) {
        logger.error("Error generating PDF summary:", error);
        await storage.updateInputData(inputData.id, {
          processingError: error.message || "Unknown error during PDF summary generation"
        });
        return res.status(500).json({ message: "Error generating PDF summary" });
      }
    } catch (error) {
      logger.error("Error processing PDF summary request:", error);
      return res.status(500).json({ message: "Error processing PDF summary request" });
    }
  }
}

export const inputDataController = new InputDataController();