import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertProjectSchema, 
  insertInputDataSchema, 
  insertRequirementSchema,
  insertActivitySchema,
  insertImplementationTaskSchema,
  insertUserSchema,
  insertInviteSchema
} from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";
import os from "os";
import nlp from "compromise";
import { processTextFile, generateRequirementsForFile } from "./gemini";
import { processPdfFile, validatePdf, extractTextFromPdf } from "./pdf-processor";
import crypto from "crypto";
import VideoProcessor from "./video-processor";
import { z } from "zod";

// Authentication middleware
function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.session && req.session.userId) {
    return next();
  }
  return res.status(401).json({ message: "Unauthorized" });
}

// Helper function to generate a secure token
function generateToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

// Configure multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const tempDir = path.join(os.tmpdir(), 'glossa-uploads');
      
      // Create temp directory if it doesn't exist
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      cb(null, tempDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
  }),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // Authentication routes
  app.post("/api/register", async (req: Request, res: Response) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      
      // Check if username or email already exists
      const existingUser = await storage.getUserByUsername(validatedData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      if (validatedData.email) {
        const existingEmail = await storage.getUserByEmail(validatedData.email);
        if (existingEmail) {
          return res.status(400).json({ message: "Email already exists" });
        }
      }
      
      // Check if invite is valid if token is provided
      if (req.body.inviteToken) {
        const invite = await storage.getInvite(req.body.inviteToken);
        if (!invite) {
          return res.status(400).json({ message: "Invalid invite token" });
        }
        
        if (invite.used) {
          return res.status(400).json({ message: "Invite token has already been used" });
        }
        
        if (invite.expiresAt < new Date()) {
          return res.status(400).json({ message: "Invite token has expired" });
        }
        
        // Update invite as used
        await storage.markInviteAsUsed(req.body.inviteToken);
        
        // Set invitedBy if the invite has a creator
        if (invite.createdById) {
          validatedData.invitedBy = invite.createdById;
        }
      }
      
      // Create the user
      const user = await storage.createUser(validatedData);
      
      // Set user in session
      req.session.userId = user.id;
      
      // Don't return the password
      const { password, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      console.error("Error registering user:", error);
      res.status(400).json({ message: "Invalid user data", error });
    }
  });
  
  app.post("/api/login", async (req: Request, res: Response) => {
    try {
      const loginSchema = z.object({
        username: z.string(),
        password: z.string()
      });
      
      const { username, password } = loginSchema.parse(req.body);
      
      // Authenticate user
      const user = await storage.authenticateUser(username, password);
      if (!user) {
        return res.status(401).json({ message: "Invalid username or password" });
      }
      
      // Set user in session
      req.session.userId = user.id;
      
      // Don't return the password
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error logging in:", error);
      res.status(400).json({ message: "Invalid login data", error });
    }
  });
  
  app.post("/api/logout", (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Failed to logout" });
      }
      res.status(200).json({ message: "Logged out successfully" });
    });
  });
  
  app.post("/api/invites", isAuthenticated, async (req: Request, res: Response) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Generate invite token
      const token = generateToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry
      
      const invite = await storage.createInvite({
        token,
        email: req.body.email || null,
        createdById: user.id,
        expiresAt
      });
      
      res.status(201).json(invite);
    } catch (error) {
      console.error("Error creating invite:", error);
      res.status(400).json({ message: "Invalid invite data", error });
    }
  });
  
  app.get("/api/invites", isAuthenticated, async (req: Request, res: Response) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const invites = await storage.getInvitesByCreator(req.session.userId);
      res.json(invites);
    } catch (error) {
      console.error("Error fetching invites:", error);
      res.status(500).json({ message: "Failed to fetch invites", error });
    }
  });

  // Current user endpoint
  app.get("/api/me", async (req: Request, res: Response) => {
    // Check if user is authenticated
    if (req.session && req.session.userId) {
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Don't return the password
      const { password, ...userWithoutPassword } = user;
      return res.json(userWithoutPassword);
    }
    
    // For demo, return the demo user if not authenticated
    const user = await storage.getUserByUsername("demo");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Don't return the password
    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  });
  
  // Update user profile endpoint
  app.put("/api/me", isAuthenticated, async (req: Request, res: Response) => {
    try {
      // Get user from session
      if (!req.session.userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Create a subset of the updateUserSchema
      const updateProfileSchema = insertUserSchema.pick({
        firstName: true,
        lastName: true,
        email: true,
        company: true,
        avatarUrl: true
      });
      
      // Validate the incoming data
      const validatedData = updateProfileSchema.parse(req.body);
      
      // Update the user
      const updatedUser = await storage.updateUser(user.id, validatedData);
      if (!updatedUser) {
        return res.status(500).json({ message: "Failed to update user" });
      }
      
      // Don't return the password
      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(400).json({ message: "Invalid user data", error });
    }
  });

  // Project endpoints
  app.get("/api/projects", async (req: Request, res: Response) => {
    // For demo, always use the demo user
    const user = await storage.getUserByUsername("demo");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const projects = await storage.getProjects(user.id);
    res.json(projects);
  });

  app.get("/api/projects/:id", async (req: Request, res: Response) => {
    const projectId = parseInt(req.params.id);
    if (isNaN(projectId)) {
      return res.status(400).json({ message: "Invalid project ID" });
    }

    const project = await storage.getProject(projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    res.json(project);
  });

  app.post("/api/projects", async (req: Request, res: Response) => {
    try {
      // For demo, always use the demo user
      const user = await storage.getUserByUsername("demo");
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const validatedData = insertProjectSchema.parse({
        ...req.body,
        userId: user.id
      });

      const project = await storage.createProject(validatedData);
      
      // Add activity for project creation
      await storage.createActivity({
        type: "created_project",
        description: `${user.username} created project "${project.name}"`,
        userId: user.id,
        projectId: project.id,
        relatedEntityId: null
      });

      res.status(201).json(project);
    } catch (error) {
      console.error("Error creating project:", error);
      res.status(400).json({ message: "Invalid project data", error });
    }
  });

  app.put("/api/projects/:id", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.id);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // For demo, always use the demo user
      const user = await storage.getUserByUsername("demo");
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // We don't need to validate the entire schema since it's a partial update
      const updatedProject = await storage.updateProject(projectId, req.body);
      
      // Add activity for project update
      await storage.createActivity({
        type: "updated_project",
        description: `${user.username} updated project "${updatedProject!.name}"`,
        userId: user.id,
        projectId: projectId,
        relatedEntityId: null
      });

      res.json(updatedProject);
    } catch (error) {
      console.error("Error updating project:", error);
      res.status(400).json({ message: "Invalid project data", error });
    }
  });

  app.delete("/api/projects/:id", async (req: Request, res: Response) => {
    const projectId = parseInt(req.params.id);
    if (isNaN(projectId)) {
      return res.status(400).json({ message: "Invalid project ID" });
    }

    const project = await storage.getProject(projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Delete the project
    await storage.deleteProject(projectId);
    
    // In a real app, we would also delete related data (requirements, input data, etc.)
    
    res.status(204).end();
  });

  // Input data endpoints
  app.get("/api/projects/:projectId/input-data", async (req: Request, res: Response) => {
    const projectId = parseInt(req.params.projectId);
    if (isNaN(projectId)) {
      return res.status(400).json({ message: "Invalid project ID" });
    }

    const project = await storage.getProject(projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const inputDataItems = await storage.getInputDataByProject(projectId);
    res.json(inputDataItems);
  });

  app.post("/api/projects/:projectId/input-data", upload.single('file'), async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // For demo, always use the demo user
      const user = await storage.getUserByUsername("demo");
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Get file type from mimetype
      const mimeTypeMap: Record<string, string> = {
        'audio/mpeg': 'audio',
        'audio/mp3': 'audio',
        'audio/wav': 'audio',
        'video/mp4': 'video',
        'video/mpeg': 'video',
        'video/quicktime': 'video',
        'application/pdf': 'pdf',
        'text/plain': 'text',
        'application/msword': 'document',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'document'
      };

      const type = mimeTypeMap[req.file.mimetype] || 'other';
      
      // Get content type from form data, default to "general" if not provided
      const contentType = req.body.contentType || "general";
      
      // Create input data record
      const inputDataRecord = await storage.createInputData({
        name: req.file.originalname,
        type,
        contentType,
        size: req.file.size,
        projectId,
        status: "processing",
        metadata: { 
          path: req.file.path,
          contentType
        }
      });

      // This would be a background job in a real app
      // Generate requirements from the uploaded file
      setTimeout(async () => {
        try {
          console.log(`Processing file: ${req.file!.originalname} (${type}) with Gemini AI`);
          
          let requirements = [];
          
          try {
            // Calculate number of analysis passes based on file size
            // Larger files get more chunks/perspectives to extract more requirements
            const fileSize = req.file!.size;
            const fileSizeInMB = fileSize / (1024 * 1024);
            
            // Scale the number of chunks and requirements based on file size
            // Small files (< 1 MB): 2 analyses with 5 reqs each (10 total)
            // Medium files (1-5 MB): 3 analyses with 5 reqs each (15 total)
            // Large files (> 5 MB): 4 analyses with 5 reqs each (20 total)
            const numAnalyses = fileSizeInMB < 1 ? 2 : (fileSizeInMB < 5 ? 3 : 4);
            const minRequirements = 5; // Minimum number of requirements to extract per chunk
            const reqPerAnalysis = minRequirements; // Keep for backward compatibility
            
            console.log(`File size: ${fileSizeInMB.toFixed(2)} MB - Using ${numAnalyses} analyses with minimum ${minRequirements} requirements each (will extract more if content supports it)`);
            
            // Process different file types with Gemini based on both file type and content type
            if (type === 'text' || type === 'document') {
              // For text files, process content with chunking
              requirements = await processTextFile(
                req.file!.path, 
                project.name, 
                req.file!.originalname,
                contentType, // Pass content type for specialized processing
                minRequirements // Minimum number of requirements to extract
              );
              console.log(`Text file processing complete: ${requirements.length} requirements extracted`);
            } else if (type === 'pdf') {
              // For PDF files, use specialized PDF processor with memory-efficient strategies
              console.log(`Processing PDF file: ${req.file!.originalname} with enhanced PDF processor`);
              
              // Check if this is a large file that requires special handling
              const fileSizeInMB = req.file!.size / (1024 * 1024);
              const isLargeFile = fileSizeInMB > 10; // Consider files over 10MB as large
              
              if (isLargeFile) {
                console.log(`Large PDF detected (${fileSizeInMB.toFixed(2)}MB), using memory-efficient processing`);
              }
              
              // Validate PDF before processing
              const pdfValidation = await validatePdf(req.file!.path, isLargeFile);
              if (!pdfValidation.valid) {
                console.warn(`PDF validation failed: ${pdfValidation.message}`);
                throw new Error(`PDF validation failed: ${pdfValidation.message}`);
              }
              
              console.log(`PDF validation successful, proceeding with enhanced PDF processing`);
              
              try {
                // Process the PDF with our enhanced processor, allowing large files if needed
                requirements = await processPdfFile(
                  req.file!.path,
                  project.name,
                  req.file!.originalname,
                  contentType,
                  minRequirements,
                  isLargeFile // Pass whether this is a large file to allow bypassing size limits
                );
                
                console.log(`PDF processing successful, extracted ${requirements.length} requirements`);
                if (requirements.length === 0) {
                  console.warn("Warning: No requirements were extracted from the PDF, checking for issues...");
                  // Check if extracted text is empty or very small
                  try {
                    const extractedText = await extractTextFromPdf(req.file!.path);
                    console.log(`Extracted text length: ${extractedText.length} characters`);
                    if (extractedText.length < 100) {
                      console.warn("Extracted text is very short, PDF may be empty, scanned, or password-protected");
                      // Generate detailed fallback requirements for scanned/image PDFs with minimum 200 words per requirement
                      requirements = [
                        { 
                          text: `The Salesforce implementation must support document scanning and OCR functionality to process the information found in the document "${req.file!.originalname}". The system should include comprehensive optical character recognition (OCR) capabilities that can extract text from scanned documents, PDFs, and images. This functionality is essential for migrating the existing workflow where users currently need to manually transcribe or enter information from physical or scanned documents. The OCR system should be able to recognize various document layouts, forms, and handwriting with high accuracy. The extracted text must be automatically categorized and mapped to appropriate Salesforce objects and fields based on the document context and content. The system should maintain an audit trail of all scanned documents, including original images, extracted text, and any manual corrections made. This requirement is critical because the current legacy system workflow involves processing numerous scanned documents and forms, and the new Salesforce implementation must provide the same or better capability to maintain business continuity. The OCR capability should also include validation rules to verify the accuracy of extracted information against existing data in the system. Users should have the ability to review OCR results and make corrections if needed before data is committed to the system of record. Performance metrics should be established for OCR accuracy, with continuous improvement processes to enhance recognition rates over time. The system should be capable of handling various document formats, resolutions, and quality levels, with appropriate error handling for documents that cannot be accurately processed.`, 
                          category: 'functional', 
                          priority: 'high' 
                        },
                        { 
                          text: `The system must include a comprehensive document management solution that supports the storage, retrieval, and management of PDF documents like "${req.file!.originalname}" within Salesforce. This solution should enable users to maintain a centralized repository of all business-critical documents that were previously stored in the legacy system. The document management solution must provide robust version control capabilities, allowing users to track changes, view revision history, and restore previous versions of documents when necessary. Access controls must be implemented to ensure that documents are only accessible to authorized users based on their roles and permissions within the system. The solution should support document classification with metadata tagging to facilitate easy searching and filtering of documents based on various attributes such as document type, date, department, and other business-relevant criteria. Integration with Salesforce objects is essential, allowing documents to be linked to relevant accounts, contacts, opportunities, cases, or custom objects to maintain business context. The system should also provide preview capabilities for common document formats including PDFs, without requiring users to download files or use external applications. The document management solution should support bulk operations for uploading, categorizing, and managing large numbers of documents during the migration process from the legacy system. It should also provide analytics and reporting on document usage, access patterns, and storage utilization. Mobile access to documents should be supported, with appropriate security controls and user experience optimizations for different device types. This requirement is essential for maintaining the document-centric workflows that exist in the current legacy system while enhancing the user experience and security.`, 
                          category: 'functional', 
                          priority: 'medium' 
                        },
                        { 
                          text: `The Salesforce implementation must include robust data extraction and transformation capabilities to process information from documents like "${req.file!.originalname}" during the migration from the legacy system. The system should be able to extract structured and unstructured data from various document formats, including scanned PDFs, using intelligent data capture technologies. Once extracted, the data must be transformed and normalized according to the Salesforce data model, with appropriate validation rules applied to ensure data integrity. The system should provide configurable mapping templates that allow administrators to define how data from different document types should be mapped to Salesforce objects and fields. These mapping templates should support conditional logic and transformations to handle complex business rules. The extraction and transformation process must include error handling mechanisms that identify issues such as missing required fields, invalid data formats, or potential duplicates, with clear notifications to users. The system should maintain detailed logs of all data extraction and transformation activities for audit and troubleshooting purposes. A user interface must be provided for business users to review and approve the extracted data before it is committed to Salesforce, with the ability to make manual corrections when necessary. The data extraction system should support batch processing for handling large volumes of documents during the initial migration phase and ongoing operations. It should also include learning capabilities to improve extraction accuracy over time based on user corrections and feedback. Integration with Salesforce's validation rules and duplicate detection mechanisms is essential to maintain data quality standards. This capability is critical for ensuring that valuable business data currently stored in documents within the legacy system is accurately migrated to and accessible within the new Salesforce implementation.`, 
                          category: 'functional', 
                          priority: 'high' 
                        },
                        { 
                          text: `The system must implement a comprehensive workflow automation solution in Salesforce that replicates and enhances the document processing workflows from the legacy system, particularly for handling documents similar to "${req.file!.originalname}". The workflow automation should support multi-step approval processes, conditional routing based on document content or metadata, and automatic task assignment to appropriate users or groups. Notifications should be configurable at each step of the workflow to keep relevant stakeholders informed of document status and required actions. The workflows must support parallel processing, allowing multiple users to work on different aspects of a document simultaneously when appropriate. Exception handling should be built into the workflows, with clear escalation paths and SLA tracking for documents that require special handling or are at risk of missing deadlines. The system should provide a visual workflow designer that allows business administrators to create and modify workflows without coding, including the ability to define entry conditions, steps, approval rules, and exit actions. Real-time visibility into workflow status is essential, with dashboards and reports that show document volume, processing times, bottlenecks, and completion rates. The workflow automation should integrate with Salesforce's standard automation tools like Process Builder, Flow, and Apex when more complex logic is required. The system should support conditional branching in workflows based on document content, metadata, or user inputs, allowing for complex business processes to be automated effectively. Integration with external systems may be required to maintain end-to-end process integrity across system boundaries. Tools for workflow optimization should be provided, with analytics that identify opportunities to improve efficiency and reduce processing times. This requirement is crucial for maintaining business continuity during the migration from the legacy system while providing opportunities for process optimization and increased efficiency.`, 
                          category: 'functional', 
                          priority: 'medium' 
                        },
                        { 
                          text: `The Salesforce implementation must include comprehensive security controls for document handling and processing that meet or exceed the protections in the legacy system. All documents uploaded to the system, including those similar to "${req.file!.originalname}", must be scanned for malware and potentially harmful content before being stored in the system. The security framework must implement proper encryption for documents both at rest and in transit, with key management systems that comply with industry best practices. Access controls should be granular, allowing permissions to be set at the document level when necessary, and should integrate with Salesforce's role hierarchy and sharing rules. The system must maintain detailed audit logs for all document-related operations, including viewing, downloading, modifying, and sharing, with user information, timestamps, and IP addresses recorded for compliance purposes. Data loss prevention (DLP) measures should be implemented to identify and protect sensitive information within documents, such as personal identifiable information (PII), financial data, or proprietary business information. The security controls must support compliance with relevant regulations such as GDPR, HIPAA, or SOX, depending on the industry and geographical scope of operations. Regular security assessments, including vulnerability scanning and penetration testing, should be conducted to ensure the document handling system remains secure against evolving threats. The security model should support the concept of least privilege, ensuring users only have access to the documents and data they need to perform their job functions. Integration with Salesforce Shield should be considered for enhanced security capabilities, including platform encryption, event monitoring, and field audit trail. Security policies and procedures should be documented and communicated to all system users, with regular training provided on secure document handling practices. This requirement is essential for maintaining data security and regulatory compliance when migrating document-centric processes from the legacy system to Salesforce.`, 
                          category: 'security', 
                          priority: 'high' 
                        }
                      ];
                      console.log(`Generated ${requirements.length} fallback requirements for scanned/image PDF with limited text content (${extractedText.length} characters)`);
                    }
                  } catch (textError) {
                    console.error("Error checking PDF text:", textError);
                  }
                }
              } catch (pdfError) {
                console.error("PDF processing error:", pdfError);
                throw pdfError;
              }
            } else if (type === 'video') {
              // For video files, use enhanced multi-perspective video processing
              console.log(`Processing video file: ${req.file!.originalname} with specialized ${contentType} analysis`);
              // Pass the inputDataId to enable scene cutting
              const processVideoFileWithScenes = async () => {
                // Import here to avoid circular dependency
                const geminiModule = await import('./gemini.js');
                return geminiModule.processVideoFile(
                  req.file!.path,
                  req.file!.originalname,
                  project.name,
                  contentType,
                  numAnalyses,
                  reqPerAnalysis,
                  inputDataRecord.id // Pass the input data ID for scene detection
                );
              };
              
              requirements = await processVideoFileWithScenes();
            } else {
              // For other non-text files, generate requirements with multiple perspectives
              requirements = await generateRequirementsForFile(
                type, 
                req.file!.originalname, 
                project.name,
                undefined, // No file path
                contentType, // Pass content type
                numAnalyses, // Number of different analysis perspectives
                reqPerAnalysis // Number of requirements per perspective
              );
            }
          } catch (geminiError) {
            console.error("Error with Gemini processing:", geminiError);
            
            // Fallback to basic NLP if Gemini fails
            console.log("Falling back to basic NLP processing");
            
            // Initialize content for requirement extraction
            let content = "";
            
            // Extract content based on file type
            if (type === 'text' || type === 'document') {
              try {
                // For text files, read directly
                content = fs.readFileSync(req.file!.path, 'utf8');
              } catch (err) {
                console.error("Error reading file:", err);
                content = `This is a sample text for ${type} file processing. 
                The system should extract information from ${req.file!.originalname}.
                Users must be able to view requirements generated from this file.
                The application shall organize requirements by priority and category.
                Security measures should be implemented for sensitive data from input sources.`;
              }
            } else if (type === 'pdf') {
              try {
                // For PDF files, read directly but handle with specialized cleanup
                content = fs.readFileSync(req.file!.path, 'utf8');
                
                // Basic PDF cleaning for fallback
                content = content.replace(/\f/g, '\n'); // Form feeds
                content = content.replace(/(\r\n|\r)/g, '\n'); // Normalize line endings
                content = content.replace(/ {2,}/g, ' '); // Remove repeated spaces
                content = content.replace(/[\u0000-\u001F\u007F-\u009F]/g, ''); // Control chars
                
                // If content is too long, take a reasonable chunk
                if (content.length > 5000) {
                  content = content.substring(0, 5000);
                }
              } catch (err) {
                console.error("Error reading PDF file:", err);
                content = `PDF document analysis for ${req.file!.originalname}.
                The system must properly extract structured content from PDF documents.
                The application shall identify section headings and document structure in PDFs.
                Implementation of clean text extraction from PDFs is required for accurate requirements gathering.
                The system should preserve formatting and bullets from structured documents.
                Security scanning for uploaded PDF documents is required to prevent malicious code execution.`;
              }
            } else if (type === 'video') {
              // Enhanced fallback for video files with workflow-focused requirements
              content = `Analysis of workflow video: ${req.file!.originalname}.
              The system must implement the complete user authentication workflow from the source system, including multi-factor authentication, password reset, and account recovery options.
              The system should replicate the order processing workflow with all approval steps, exception handling, and integration with inventory management systems.
              The application shall migrate the customer onboarding workflow, preserving all validation rules, KYC processes, and automated document verification processes.
              Implementation of the financial transaction workflow is required with all security controls, audit logging, and reconciliation processes maintained.
              The data migration workflow must include comprehensive mapping between source and target systems, data transformation rules, and validation checkpoints.
              The system should support notification workflows including email, SMS, and in-app alerts based on specific triggers and user preferences.`;
            } else if (type === 'audio') {
              // Placeholder for audio
              content = `Transcription from audio file: ${req.file!.originalname}.
              The system must support audio processing for requirements extraction.
              Users should be able to navigate through audio content with precise timestamp markers.
              The application shall display waveform visualization of the audio content.
              Implementation of audio analysis capabilities is required to identify speakers and key segments.
              Security measures must be in place to protect sensitive audio content.`;
            } else {
              // For other file types
              content = `Processing for ${req.file!.originalname}.
              The system should support this file format for requirement extraction.
              Users must be able to filter requirements by different criteria.
              The application shall provide detailed views of each requirement.
              Security protocols should be implemented for all uploaded files.`;
            }
            
            // Use NLP to extract and process requirements
            const doc = nlp(content);
            const sentences = doc.sentences().out('array');
            
            const requirementKeywords = [
              'must', 'should', 'will', 'shall', 'required', 'needs to', 
              'have to', 'system', 'user', 'implement', 'support',
              'application', 'feature', 'functionality', 'interface'
            ];
            
            // Filter sentences that are likely requirements
            const potentialRequirements = sentences.filter((sentence: string) => 
              requirementKeywords.some(keyword => sentence.toLowerCase().includes(keyword)) &&
              sentence.length > 20 && sentence.length < 200
            );
            
            // Format requirements for consistent processing
            requirements = potentialRequirements.slice(0, 5).map((text: string) => ({
              text,
              category: 'functional',
              priority: 'medium'
            }));
            
            // If no requirements found, create fallback requirements based on file type
            if (requirements.length === 0) {
              if (type === 'video') {
                // Create workflow-specific fallback requirements for video files
                requirements = [
                  { text: `The system must migrate the user management workflow from the source system, including all roles, permissions, and authentication processes shown in ${req.file!.originalname}`, category: 'functional', priority: 'high' },
                  { text: `The system shall replicate the data processing workflow with all validation rules, transformation logic, and error handling as demonstrated in the source system`, category: 'functional', priority: 'high' },
                  { text: `The notification workflow must be implemented with identical triggers, delivery channels, and personalization options as the source system`, category: 'functional', priority: 'medium' },
                  { text: `The reporting workflow shall be migrated with all existing templates, scheduling capabilities, and export formats maintained from the source system`, category: 'functional', priority: 'medium' },
                  { text: `The system must implement the complete security and audit workflow to maintain compliance with all regulatory requirements shown in the video`, category: 'security', priority: 'high' }
                ];
              } else {
                // Default fallback requirements for other file types
                requirements = [
                  { text: `The system must properly process ${type} files like ${req.file!.originalname}`, category: 'functional', priority: 'high' },
                  { text: `Users should be able to view detailed information about requirements extracted from ${type} files`, category: 'functional', priority: 'medium' },
                  { text: `The application shall provide filtering and sorting options for requirements`, category: 'functional', priority: 'medium' },
                  { text: `Implementation of version control is required for tracking requirement changes`, category: 'non-functional', priority: 'low' },
                  { text: `Security measures must be in place to protect sensitive data in uploaded files`, category: 'security', priority: 'high' }
                ];
              }
            }
          }
          
          // Process and store all requirements
          console.log(`Saving ${requirements.length} unique requirements to the database`);
          
          // Get the current count of requirements to generate sequential code IDs
          const requirementsCount = (await storage.getRequirementsByProject(projectId)).length;
          
          // Process all requirements (no limit)
          for (let i = 0; i < requirements.length; i++) {
            const requirement = requirements[i];
            
            // Generate a sequential code ID
            const codeId = `REQ-${(requirementsCount + i + 1).toString().padStart(3, '0')}`;
            
            await storage.createRequirement({
              text: requirement.text,
              category: requirement.category || 'functional',
              priority: requirement.priority || 'medium',
              projectId,
              inputDataId: inputDataRecord.id,
              codeId,
              source: inputDataRecord.name,
              videoScenes: requirement.videoScenes || []
            });
          }
          
          // Update input data status to completed
          await storage.updateInputData(inputDataRecord.id, { status: "completed" });
          
          // Add activity
          await storage.createActivity({
            type: "generated_requirements",
            description: `${user.username} generated requirements from ${inputDataRecord.name}`,
            userId: user.id,
            projectId,
            relatedEntityId: inputDataRecord.id
          });
        } catch (error) {
          console.error("Error processing file:", error);
          await storage.updateInputData(inputDataRecord.id, { status: "failed" });
        }
      }, 2000);

      // Add activity for upload
      await storage.createActivity({
        type: "uploaded_data",
        description: `${user.username} uploaded ${req.file.originalname}`,
        userId: user.id,
        projectId,
        relatedEntityId: inputDataRecord.id
      });

      res.status(201).json(inputDataRecord);
    } catch (error) {
      console.error("Error uploading input data:", error);
      res.status(400).json({ message: "Error uploading file", error });
    }
  });

  // Requirements endpoints
  // Define high-priority requirements route explicitly first
  app.get("/api/projects/:projectId/requirements/high-priority", async (req: Request, res: Response) => {
    const projectId = parseInt(req.params.projectId);
    if (isNaN(projectId)) {
      return res.status(400).json({ message: "Invalid project ID" });
    }

    const project = await storage.getProject(projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }
    
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 4;
    const requirements = await storage.getHighPriorityRequirements(projectId, limit);
    
    res.json(requirements);
  });
  
  // Get a specific requirement by ID - this needs to come BEFORE the general requirements route
  app.get("/api/projects/:projectId/requirements/:id([0-9]+)", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const requirementId = parseInt(req.params.id);
      
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }
      
      if (isNaN(requirementId)) {
        return res.status(400).json({ message: "Invalid requirement ID" });
      }

      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      const requirement = await storage.getRequirement(requirementId);
      if (!requirement) {
        return res.status(404).json({ message: "Requirement not found" });
      }

      if (requirement.projectId !== projectId) {
        return res.status(404).json({ message: "Requirement does not belong to this project" });
      }

      res.json(requirement);
    } catch (error) {
      console.error("Error fetching requirement:", error);
      res.status(400).json({ message: "Error fetching requirement", error });
    }
  });

  app.get("/api/projects/:projectId/requirements", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      const requirements = await storage.getRequirementsByProject(projectId);
      
      // Filter requirements based on query params
      let filteredRequirements = [...requirements];
      
      // Apply category filter
      if (req.query.category) {
        filteredRequirements = filteredRequirements.filter(
          r => r.category === req.query.category
        );
      }
      
      // Apply priority filter
      if (req.query.priority) {
        filteredRequirements = filteredRequirements.filter(
          r => r.priority === req.query.priority
        );
      }
      
      // Apply source filter
      if (req.query.source) {
        filteredRequirements = filteredRequirements.filter(
          r => r.source === req.query.source
        );
      }
      
      // Apply search filter (case-insensitive partial match)
      if (req.query.search) {
        const searchTerm = (req.query.search as string).toLowerCase();
        filteredRequirements = filteredRequirements.filter(
          r => r.text.toLowerCase().includes(searchTerm) || 
               r.category.toLowerCase().includes(searchTerm) ||
               (r.source && r.source.toLowerCase().includes(searchTerm))
        );
      }

      res.json(filteredRequirements);
    } catch (error) {
      console.error("Error fetching requirements:", error);
      res.status(400).json({ message: "Error fetching requirements", error });
    }
  });

  app.post("/api/projects/:projectId/requirements", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // For demo, always use the demo user
      const user = await storage.getUserByUsername("demo");
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Generate a code ID
      const requirementsCount = (await storage.getRequirementsByProject(projectId)).length;
      const codeId = `REQ-${(requirementsCount + 1).toString().padStart(3, '0')}`;
      
      // Handle null values for optional fields
      const requestData = {
        ...req.body,
        projectId,
        inputDataId: req.body.inputDataId || null,
        codeId,
        source: req.body.source || null
      };

      const validatedData = insertRequirementSchema.parse(requestData);
      const requirement = await storage.createRequirement(validatedData);

      // Add activity
      await storage.createActivity({
        type: "created_requirement",
        description: `${user.username} created requirement ${requirement.codeId}`,
        userId: user.id,
        projectId,
        relatedEntityId: requirement.id
      });

      res.status(201).json(requirement);
    } catch (error) {
      console.error("Error creating requirement:", error);
      res.status(400).json({ message: "Invalid requirement data", error });
    }
  });

  app.put("/api/projects/:projectId/requirements/:id", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const requirementId = parseInt(req.params.id);
      
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }
      
      if (isNaN(requirementId)) {
        return res.status(400).json({ message: "Invalid requirement ID" });
      }

      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      const requirement = await storage.getRequirement(requirementId);
      if (!requirement) {
        return res.status(404).json({ message: "Requirement not found" });
      }

      if (requirement.projectId !== projectId) {
        return res.status(404).json({ message: "Requirement does not belong to this project" });
      }

      // For demo, always use the demo user
      const user = await storage.getUserByUsername("demo");
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Handle null values for optional fields
      const requestData = {
        ...req.body,
        inputDataId: req.body.inputDataId === "" ? null : req.body.inputDataId,
        source: req.body.source === "" ? null : req.body.source
      };

      const updatedRequirement = await storage.updateRequirement(requirementId, requestData);

      // Add activity
      await storage.createActivity({
        type: "updated_requirement",
        description: `${user.username} updated requirement ${updatedRequirement!.codeId}`,
        userId: user.id,
        projectId,
        relatedEntityId: requirementId
      });

      res.json(updatedRequirement);
    } catch (error) {
      console.error("Error updating requirement:", error);
      res.status(400).json({ message: "Invalid requirement data", error });
    }
  });

  app.delete("/api/projects/:projectId/requirements/:id", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const requirementId = parseInt(req.params.id);
      
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }
      
      if (isNaN(requirementId)) {
        return res.status(400).json({ message: "Invalid requirement ID" });
      }

      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      const requirement = await storage.getRequirement(requirementId);
      if (!requirement) {
        return res.status(404).json({ message: "Requirement not found" });
      }

      if (requirement.projectId !== projectId) {
        return res.status(404).json({ message: "Requirement does not belong to this project" });
      }

      // For demo, always use the demo user
      const user = await storage.getUserByUsername("demo");
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Delete the requirement
      await storage.deleteRequirement(requirementId);

      // Add activity
      await storage.createActivity({
        type: "deleted_requirement",
        description: `${user.username} deleted requirement ${requirement.codeId}`,
        userId: user.id,
        projectId,
        relatedEntityId: null
      });

      res.status(204).end();
    } catch (error) {
      console.error("Error deleting requirement:", error);
      res.status(400).json({ message: "Error deleting requirement", error });
    }
  });

  // Activities endpoint for a specific project
  app.get("/api/projects/:projectId/activities", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const activities = await storage.getActivitiesByProject(projectId, limit);
      
      // Collect unique user IDs from activities
      const userIds: number[] = [];
      activities.forEach(activity => {
        if (!userIds.includes(activity.userId)) {
          userIds.push(activity.userId);
        }
      });
      
      // Get user data for all users involved in activities
      const usersMap = new Map();
      for (let i = 0; i < userIds.length; i++) {
        const userId = userIds[i];
        const user = await storage.getUser(userId);
        if (user) {
          // Exclude sensitive data
          const { password, ...userData } = user;
          usersMap.set(userId, userData);
        }
      }
      
      // Add user data to each activity
      const activitiesWithUsers = activities.map(activity => {
        const user = usersMap.get(activity.userId);
        return {
          ...activity,
          user: user || null
        };
      });
      
      res.json(activitiesWithUsers);
    } catch (error) {
      console.error("Error fetching activities:", error);
      res.status(400).json({ message: "Error fetching activities", error });
    }
  });
  
  // Activities endpoint for all projects
  app.get("/api/activities", async (req: Request, res: Response) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const activities = await storage.getAllActivities(limit);
      
      // Fetch project names to include with activities
      const projectsMap = new Map();
      const projects = Array.from((await storage.getProjects(1)));
      projects.forEach(project => {
        projectsMap.set(project.id, project);
      });
      
      // Collect unique user IDs from activities
      const userIds: number[] = [];
      activities.forEach(activity => {
        if (!userIds.includes(activity.userId)) {
          userIds.push(activity.userId);
        }
      });
      
      // Get user data for all users involved in activities
      const usersMap = new Map();
      for (let i = 0; i < userIds.length; i++) {
        const userId = userIds[i];
        const user = await storage.getUser(userId);
        if (user) {
          // Exclude sensitive data
          const { password, ...userData } = user;
          usersMap.set(userId, userData);
        }
      }
      
      // Add project name and user data to each activity
      const activitiesWithData = activities.map(activity => {
        const project = projectsMap.get(activity.projectId);
        const user = usersMap.get(activity.userId);
        return {
          ...activity,
          projectName: project ? project.name : 'Unknown Project',
          user: user || null
        };
      });
      
      res.json(activitiesWithData);
    } catch (error) {
      console.error("Error fetching all activities:", error);
      res.status(400).json({ message: "Error fetching all activities", error });
    }
  });

  // Export endpoint
  app.get("/api/projects/:projectId/export", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      const requirements = await storage.getRequirementsByProject(projectId);
      
      // Create the export data structure
      const exportData = {
        project: {
          name: project.name,
          description: project.description,
          type: project.type,
          exportDate: new Date().toISOString()
        },
        requirements: requirements.map(r => ({
          id: r.codeId,
          text: r.text,
          category: r.category,
          priority: r.priority,
          source: r.source
        }))
      };
      
      res.json(exportData);
    } catch (error) {
      console.error("Error generating export:", error);
      res.status(400).json({ message: "Error generating export", error });
    }
  });

  // Implementation Tasks endpoints
  app.get("/api/requirements/:requirementId/tasks", async (req: Request, res: Response) => {
    try {
      const requirementId = parseInt(req.params.requirementId);
      if (isNaN(requirementId)) {
        return res.status(400).json({ message: "Invalid requirement ID" });
      }

      const requirement = await storage.getRequirement(requirementId);
      if (!requirement) {
        return res.status(404).json({ message: "Requirement not found" });
      }

      const tasks = await storage.getImplementationTasksByRequirement(requirementId);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(400).json({ message: "Error fetching tasks", error });
    }
  });

  app.post("/api/requirements/:requirementId/tasks", async (req: Request, res: Response) => {
    try {
      const requirementId = parseInt(req.params.requirementId);
      if (isNaN(requirementId)) {
        return res.status(400).json({ message: "Invalid requirement ID" });
      }

      const requirement = await storage.getRequirement(requirementId);
      if (!requirement) {
        return res.status(404).json({ message: "Requirement not found" });
      }

      // For demo, always use the demo user
      const user = await storage.getUserByUsername("demo");
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Handle null values for optional fields
      const requestData = {
        ...req.body,
        requirementId,
        estimatedHours: req.body.estimatedHours || null,
        complexity: req.body.complexity || null,
        assignee: req.body.assignee || null
      };

      const validatedData = insertImplementationTaskSchema.parse(requestData);
      const task = await storage.createImplementationTask(validatedData);

      // Add activity
      await storage.createActivity({
        type: "created_task",
        description: `${user.username} created implementation task "${task.title}"`,
        userId: user.id,
        projectId: requirement.projectId,
        relatedEntityId: task.id
      });

      res.status(201).json(task);
    } catch (error) {
      console.error("Error creating task:", error);
      res.status(400).json({ message: "Invalid task data", error });
    }
  });

  app.get("/api/projects/:projectId/tasks", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // First, get all requirements for the project
      const requirements = await storage.getRequirementsByProject(projectId);
      
      if (!requirements || requirements.length === 0) {
        return res.json([]);
      }
      
      // Get tasks for each requirement
      const tasksPromises = requirements.map(req => 
        storage.getImplementationTasksByRequirement(req.id)
      );
      
      const allTasksNested = await Promise.all(tasksPromises);
      const allTasks = allTasksNested.flat();
      
      res.json(allTasks);
    } catch (error) {
      console.error("Error fetching project tasks:", error);
      res.status(500).json({ message: "Failed to fetch project tasks" });
    }
  });

  app.get("/api/tasks/:id", async (req: Request, res: Response) => {
    try {
      const taskId = parseInt(req.params.id);
      if (isNaN(taskId)) {
        return res.status(400).json({ message: "Invalid task ID" });
      }

      const task = await storage.getImplementationTask(taskId);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      res.json(task);
    } catch (error) {
      console.error("Error fetching task:", error);
      res.status(400).json({ message: "Error fetching task", error });
    }
  });

  app.put("/api/tasks/:id", async (req: Request, res: Response) => {
    try {
      const taskId = parseInt(req.params.id);
      if (isNaN(taskId)) {
        return res.status(400).json({ message: "Invalid task ID" });
      }

      const task = await storage.getImplementationTask(taskId);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      // For demo, always use the demo user
      const user = await storage.getUserByUsername("demo");
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Handle null values for optional fields
      const requestData = {
        ...req.body,
        estimatedHours: req.body.estimatedHours === "" ? null : req.body.estimatedHours,
        complexity: req.body.complexity === "" ? null : req.body.complexity,
        assignee: req.body.assignee === "" ? null : req.body.assignee
      };

      const updatedTask = await storage.updateImplementationTask(taskId, requestData);

      // Get the requirement to find the project ID
      const requirement = await storage.getRequirement(task.requirementId);
      if (!requirement) {
        return res.status(404).json({ message: "Related requirement not found" });
      }

      // Add activity
      await storage.createActivity({
        type: "updated_task",
        description: `${user.username} updated implementation task "${updatedTask!.title}"`,
        userId: user.id,
        projectId: requirement.projectId,
        relatedEntityId: taskId
      });

      res.json(updatedTask);
    } catch (error) {
      console.error("Error updating task:", error);
      res.status(400).json({ message: "Invalid task data", error });
    }
  });

  app.delete("/api/tasks/:id", async (req: Request, res: Response) => {
    try {
      const taskId = parseInt(req.params.id);
      if (isNaN(taskId)) {
        return res.status(400).json({ message: "Invalid task ID" });
      }

      const task = await storage.getImplementationTask(taskId);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      // For demo, always use the demo user
      const user = await storage.getUserByUsername("demo");
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Get the requirement to find the project ID
      const requirement = await storage.getRequirement(task.requirementId);
      if (!requirement) {
        return res.status(404).json({ message: "Related requirement not found" });
      }

      // Delete the task
      await storage.deleteImplementationTask(taskId);

      // Add activity
      await storage.createActivity({
        type: "deleted_task",
        description: `${user.username} deleted implementation task "${task.title}"`,
        userId: user.id,
        projectId: requirement.projectId,
        relatedEntityId: null
      });

      res.status(204).end();
    } catch (error) {
      console.error("Error deleting task:", error);
      res.status(400).json({ message: "Error deleting task", error });
    }
  });

  // Endpoint to automatically generate implementation tasks for a requirement
  app.post("/api/requirements/:requirementId/generate-tasks", async (req: Request, res: Response) => {
    try {
      const requirementId = parseInt(req.params.requirementId);
      if (isNaN(requirementId)) {
        return res.status(400).json({ message: "Invalid requirement ID" });
      }

      const requirement = await storage.getRequirement(requirementId);
      if (!requirement) {
        return res.status(404).json({ message: "Requirement not found" });
      }

      const project = await storage.getProject(requirement.projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // For demo, always use the demo user
      const user = await storage.getUserByUsername("demo");
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if source and target systems are defined
      if (!project.sourceSystem || !project.targetSystem) {
        return res.status(400).json({ 
          message: "Source or target system not defined for this project. Please update the project with these details first."
        });
      }

      // Extract key phrases from requirement text to create more specific tasks
      const reqText = requirement.text.toLowerCase();
      
      // Analyze requirement category and text to determine specific tasks
      const isUserInterface = reqText.includes('ui') || reqText.includes('interface') || 
                             reqText.includes('screen') || reqText.includes('dashboard') || 
                             reqText.includes('portal') || reqText.includes('console');
      
      const isWorkflow = reqText.includes('workflow') || reqText.includes('process') || 
                        reqText.includes('flow') || reqText.includes('procedure');
      
      const isIntegration = reqText.includes('integration') || reqText.includes('connect') || 
                           reqText.includes('api') || reqText.includes('middleware') || 
                           reqText.includes('sync') || reqText.includes('data exchange');
      
      const isReporting = reqText.includes('report') || reqText.includes('dashboard') || 
                         reqText.includes('analytics') || reqText.includes('metrics') || 
                         reqText.includes('kpi');
      
      const isSecurityRelated = reqText.includes('security') || reqText.includes('authentication') || 
                               reqText.includes('authorization') || reqText.includes('permission') || 
                               reqText.includes('role') || reqText.includes('access control');
      
      const isPerformanceRelated = reqText.includes('performance') || reqText.includes('speed') || 
                                  reqText.includes('scalability') || reqText.includes('load');
      
      const isCaseManagement = reqText.includes('case') || reqText.includes('ticket') || 
                              reqText.includes('service request') || reqText.includes('incident');
      
      const isCustomerData = reqText.includes('customer') || reqText.includes('contact') || 
                            reqText.includes('account') || reqText.includes('client');
      
      const isSLA = reqText.includes('sla') || reqText.includes('service level') || 
                    reqText.includes('agreement') || reqText.includes('response time');
      
      // Create detailed source system tasks
      const sourceTasks = [];
      
      // Add specific source system tasks based on requirement analysis
      if (isCustomerData) {
        sourceTasks.push({
          title: `Map customer data fields in ${project.sourceSystem}`,
          description: `Identify and document customer profile attributes, history records, and relationships in ${project.sourceSystem} needed for migration of: ${requirement.text}`,
          status: "pending",
          priority: requirement.priority,
          system: "source",
          requirementId: requirement.id,
          estimatedHours: 6,
          complexity: "high",
          assignee: null
        });
      }
      
      if (isWorkflow) {
        sourceTasks.push({
          title: `Document ${project.sourceSystem} workflow states and transitions`,
          description: `Create detailed flow diagrams of the existing workflows in ${project.sourceSystem}, capturing triggers, conditions, actions, and state transitions for: ${requirement.text}`,
          status: "pending",
          priority: requirement.priority,
          system: "source",
          requirementId: requirement.id,
          estimatedHours: 8,
          complexity: "high",
          assignee: null
        });
      }
      
      if (isCaseManagement) {
        sourceTasks.push({
          title: `Document case routing and assignment rules in ${project.sourceSystem}`,
          description: `Extract and document the rules that govern case assignment, prioritization, queueing, and routing in ${project.sourceSystem} for: ${requirement.text}`,
          status: "pending",
          priority: requirement.priority,
          system: "source",
          requirementId: requirement.id,
          estimatedHours: 5,
          complexity: "medium",
          assignee: null
        });
      }
      
      if (isIntegration) {
        sourceTasks.push({
          title: `Map integration touchpoints in ${project.sourceSystem}`,
          description: `Identify all external systems, API endpoints, data formats, and integration patterns currently used in ${project.sourceSystem} for: ${requirement.text}`,
          status: "pending",
          priority: requirement.priority,
          system: "source",
          requirementId: requirement.id,
          estimatedHours: 7,
          complexity: "high",
          assignee: null
        });
      }
      
      if (isReporting) {
        sourceTasks.push({
          title: `Extract report definitions and data sources from ${project.sourceSystem}`,
          description: `Document existing reports, dashboards, metrics calculations, and data sources in ${project.sourceSystem} to support: ${requirement.text}`,
          status: "pending",
          priority: requirement.priority,
          system: "source",
          requirementId: requirement.id,
          estimatedHours: 5,
          complexity: "medium",
          assignee: null
        });
      }
      
      if (isSLA) {
        sourceTasks.push({
          title: `Document SLA configuration in ${project.sourceSystem}`,
          description: `Extract SLA definitions, calculation rules, escalation paths, and notification triggers from ${project.sourceSystem} for: ${requirement.text}`,
          status: "pending",
          priority: requirement.priority,
          system: "source",
          requirementId: requirement.id,
          estimatedHours: 4,
          complexity: "medium",
          assignee: null
        });
      }
      
      // Always add a generic data extraction task if no specific tasks were created
      if (sourceTasks.length === 0) {
        sourceTasks.push({
          title: `Extract key data structures from ${project.sourceSystem}`,
          description: `Identify and document the primary data objects, fields, relationships, and business rules in ${project.sourceSystem} needed to implement: ${requirement.text}`,
          status: "pending",
          priority: requirement.priority,
          system: "source",
          requirementId: requirement.id,
          estimatedHours: 6,
          complexity: "high",
          assignee: null
        });
      }
      
      // Always add a test data extraction task
      sourceTasks.push({
        title: `Create migration test dataset from ${project.sourceSystem}`,
        description: `Extract representative data samples from ${project.sourceSystem} that cover edge cases and common scenarios for testing: ${requirement.text}`,
        status: "pending",
        priority: requirement.priority,
        system: "source",
        requirementId: requirement.id,
        estimatedHours: 4,
        complexity: "medium",
        assignee: null
      });

      // Create detailed target system tasks
      const targetTasks = [];
      
      // Add specific target system tasks based on requirement analysis
      if (isUserInterface) {
        targetTasks.push({
          title: `Design user interface components in ${project.targetSystem}`,
          description: `Create UI mockups, screen flows, and interactive prototypes for the interface requirements specified in: ${requirement.text}`,
          status: "pending",
          priority: requirement.priority,
          system: "target",
          requirementId: requirement.id,
          estimatedHours: 8,
          complexity: "medium",
          assignee: null
        });
      }
      
      if (isWorkflow) {
        targetTasks.push({
          title: `Configure workflow states and transitions in ${project.targetSystem}`,
          description: `Implement the workflow engine configuration, stages, transitions, conditions, and triggers in ${project.targetSystem} to match: ${requirement.text}`,
          status: "pending",
          priority: requirement.priority,
          system: "target",
          requirementId: requirement.id,
          estimatedHours: 10,
          complexity: "high",
          assignee: null
        });
      }
      
      if (isCaseManagement) {
        targetTasks.push({
          title: `Implement case routing and assignment logic in ${project.targetSystem}`,
          description: `Develop the case management component in ${project.targetSystem} with the routing, assignment, and escalation logic required for: ${requirement.text}`,
          status: "pending",
          priority: requirement.priority,
          system: "target",
          requirementId: requirement.id,
          estimatedHours: 12,
          complexity: "high",
          assignee: null
        });
      }
      
      if (isIntegration) {
        targetTasks.push({
          title: `Develop integration interfaces in ${project.targetSystem}`,
          description: `Build the API endpoints, listeners, transformers, and connectors in ${project.targetSystem} to integrate with external systems for: ${requirement.text}`,
          status: "pending",
          priority: requirement.priority,
          system: "target",
          requirementId: requirement.id,
          estimatedHours: 10,
          complexity: "high",
          assignee: null
        });
      }
      
      if (isReporting) {
        targetTasks.push({
          title: `Implement reporting and analytics in ${project.targetSystem}`,
          description: `Create reports, dashboards, and analytics capabilities in ${project.targetSystem} to satisfy the reporting needs specified in: ${requirement.text}`,
          status: "pending",
          priority: requirement.priority,
          system: "target",
          requirementId: requirement.id,
          estimatedHours: 8,
          complexity: "medium",
          assignee: null
        });
      }
      
      if (isSecurityRelated) {
        targetTasks.push({
          title: `Implement security controls in ${project.targetSystem}`,
          description: `Develop the authentication, authorization, and role-based access control mechanisms in ${project.targetSystem} to meet the security requirements in: ${requirement.text}`,
          status: "pending",
          priority: requirement.priority,
          system: "target",
          requirementId: requirement.id,
          estimatedHours: 8,
          complexity: "high",
          assignee: null
        });
      }
      
      if (isPerformanceRelated) {
        targetTasks.push({
          title: `Implement performance optimizations in ${project.targetSystem}`,
          description: `Design and implement caching, indexing, and other performance tuning strategies in ${project.targetSystem} to meet the performance needs in: ${requirement.text}`,
          status: "pending",
          priority: requirement.priority,
          system: "target",
          requirementId: requirement.id,
          estimatedHours: 6,
          complexity: "high",
          assignee: null
        });
      }
      
      if (isSLA) {
        targetTasks.push({
          title: `Configure SLA tracking in ${project.targetSystem}`,
          description: `Implement service level agreement definitions, tracking, escalation rules, and notifications in ${project.targetSystem} for: ${requirement.text}`,
          status: "pending",
          priority: requirement.priority,
          system: "target",
          requirementId: requirement.id,
          estimatedHours: 6,
          complexity: "medium",
          assignee: null
        });
      }
      
      // Always add a core implementation task if no specific tasks were created
      if (targetTasks.length === 0) {
        targetTasks.push({
          title: `Implement core functionality in ${project.targetSystem}`,
          description: `Design and develop the primary features and data structures in ${project.targetSystem} required to fulfill: ${requirement.text}`,
          status: "pending",
          priority: requirement.priority,
          system: "target",
          requirementId: requirement.id,
          estimatedHours: 10,
          complexity: requirement.priority === "high" ? "high" : "medium",
          assignee: null
        });
      }
      
      // Always add data migration and testing tasks
      targetTasks.push({
        title: `Develop data migration scripts for ${project.targetSystem}`,
        description: `Create data transformation and loading procedures to migrate data from ${project.sourceSystem} to ${project.targetSystem} for: ${requirement.text}`,
        status: "pending",
        priority: requirement.priority,
        system: "target",
        requirementId: requirement.id,
        estimatedHours: 8,
        complexity: "high",
        assignee: null
      });
      
      targetTasks.push({
        title: `Create automated tests for ${project.targetSystem}`,
        description: `Develop comprehensive test suite including unit, integration, and acceptance tests for the implementation of: ${requirement.text}`,
        status: "pending",
        priority: requirement.priority,
        system: "target",
        requirementId: requirement.id,
        estimatedHours: 6,
        complexity: "medium",
        assignee: null
      });

      // Combine all tasks
      const allTasks = [...sourceTasks, ...targetTasks];
      
      // Create all tasks
      const createdTasks = [];
      for (const taskData of allTasks) {
        const task = await storage.createImplementationTask(taskData);
        createdTasks.push(task);
      }

      // Add activity
      await storage.createActivity({
        type: "generated_tasks",
        description: `${user.username} generated ${createdTasks.length} implementation tasks for requirement ${requirement.codeId}`,
        userId: user.id,
        projectId: requirement.projectId,
        relatedEntityId: requirement.id
      });

      res.status(201).json(createdTasks);
    } catch (error) {
      console.error("Error generating tasks:", error);
      res.status(500).json({ message: "Error generating implementation tasks", error });
    }
  });

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ message: "An unexpected error occurred", error: err.message });
  });

  return httpServer;
}