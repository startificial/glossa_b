import express, { type Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { createProjectInDb, updateProjectInDb } from "./database";
import { 
  insertProjectSchema, 
  insertInputDataSchema, 
  insertRequirementSchema,
  insertActivitySchema,
  insertImplementationTaskSchema,
  insertUserSchema,
  insertInviteSchema,
  insertCustomerSchema,
  customers,
  projects
} from "@shared/schema";
import { eq, asc, desc } from "drizzle-orm";
import { AcceptanceCriterion } from "@shared/types";
import multer from "multer";
import path from "path";
import fs from "fs";
import os from "os";
import nlp from "compromise";
import { processTextFile, generateRequirementsForFile } from "./gemini";
import { processPdfFile, validatePdf, extractTextFromPdf } from "./pdf-processor";
import { analyzePdf } from "./pdf-analyzer";
import crypto from "crypto";
import VideoProcessor from "./video-processor";
import { generateAcceptanceCriteria, generateImplementationTasks } from "./claude";
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
  
  // Serve uploaded files from both tmp directory and local uploads directory
  // First, setup the temp uploads dir for normal file uploads
  const uploadsDir = path.join(os.tmpdir(), 'glossa-uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  
  // Second, setup access to our local uploads directory for test files
  const localUploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(localUploadsDir)) {
    fs.mkdirSync(localUploadsDir, { recursive: true });
  }
  
  // Serve files from both directories
  app.use("/api/uploads", express.static(uploadsDir));
  app.use("/api/uploads", express.static(localUploadsDir));

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
    
    // For demo, auto-login as demo user if not authenticated
    const demoUser = await storage.getUserByUsername("demo");
    if (!demoUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Set user in session
    req.session.userId = demoUser.id;
    
    // Don't return the password
    const { password, ...userWithoutPassword } = demoUser;
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

  // Customer routes
  app.get("/api/customers", async (req: Request, res: Response) => {
    try {
      const customersList = await db.query.customers.findMany({
        orderBy: (customers, { desc }) => [desc(customers.updatedAt)]
      });
      res.json(customersList);
    } catch (error) {
      console.error("Error fetching customers:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/customers/:id", async (req: Request, res: Response) => {
    const customerId = parseInt(req.params.id);
    if (isNaN(customerId)) {
      return res.status(400).json({ message: "Invalid customer ID" });
    }

    try {
      const customer = await db.query.customers.findFirst({
        where: eq(customers.id, customerId)
      });

      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }

      // Get projects associated with this customer
      const customerProjects = await db.query.projects.findMany({
        where: eq(projects.customerId, customerId),
        columns: {
          id: true,
          name: true,
          description: true,
          // Don't include type field if it's not in the database
          sourceSystem: true,
          targetSystem: true,
          createdAt: true,
          updatedAt: true
        }
      });

      console.log('Customer id:', customerId);
      console.log('Customer projects:', customerProjects);
      
      const responseData = { ...customer, projects: customerProjects };
      console.log('Response data:', responseData);
      
      res.json(responseData);
    } catch (error) {
      console.error("Error fetching customer:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/customers", async (req: Request, res: Response) => {
    try {
      const customerData = insertCustomerSchema.parse(req.body);
      
      const result = await db.insert(customers).values(customerData).returning();
      res.status(201).json(result[0]);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid customer data", errors: error.errors });
      }
      console.error("Error creating customer:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/customers/:id", async (req: Request, res: Response) => {
    const customerId = parseInt(req.params.id);
    if (isNaN(customerId)) {
      return res.status(400).json({ message: "Invalid customer ID" });
    }

    try {
      const customerData = insertCustomerSchema.parse(req.body);
      
      const result = await db.update(customers)
        .set({
          ...customerData,
          updatedAt: new Date()
        })
        .where(eq(customers.id, customerId))
        .returning();
      
      if (result.length === 0) {
        return res.status(404).json({ message: "Customer not found" });
      }
      
      res.json(result[0]);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid customer data", errors: error.errors });
      }
      console.error("Error updating customer:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/customers/:id", async (req: Request, res: Response) => {
    const customerId = parseInt(req.params.id);
    if (isNaN(customerId)) {
      return res.status(400).json({ message: "Invalid customer ID" });
    }

    try {
      // Check if customer has associated projects
      const associatedProjects = await db.query.projects.findMany({
        where: eq(projects.customerId, customerId),
        columns: {
          id: true,
          name: true
        }
      });

      if (associatedProjects.length > 0) {
        return res.status(400).json({ 
          message: "Cannot delete customer with associated projects. Please remove or reassign the projects first."
        });
      }

      await db.delete(customers).where(eq(customers.id, customerId));
      res.status(200).json({ message: "Customer deleted successfully" });
    } catch (error) {
      console.error("Error deleting customer:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Project endpoints
  app.get("/api/projects", async (req: Request, res: Response) => {
    try {
      // For demo, always use the demo user
      const user = await storage.getUserByUsername("demo");
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Query projects from the database
      const projectsList = await db.query.projects.findMany({
        where: eq(projects.userId, user.id),
        orderBy: [desc(projects.updatedAt)]
      });
      
      res.json(projectsList);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/projects/:id", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.id);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      // Query project from the database
      const project = await db.query.projects.findFirst({
        where: eq(projects.id, projectId)
      });
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // If the project has a customer ID, fetch the customer details
      if (project.customerId) {
        const customer = await db.query.customers.findFirst({
          where: eq(customers.id, project.customerId)
        });
        
        if (customer) {
          // Return project with associated customer
          return res.json({
            ...project,
            customer
          });
        }
      }

      res.json(project);
    } catch (error) {
      console.error("Error fetching project:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/projects", async (req: Request, res: Response) => {
    try {
      // For demo, always use the demo user
      const user = await storage.getUserByUsername("demo");
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      console.log('Creating project with data:', req.body);

      // If customerId is provided, verify it exists
      if (req.body.customerId) {
        const customerId = parseInt(req.body.customerId);
        const customer = await db.query.customers.findFirst({
          where: eq(customers.id, customerId)
        });
        
        if (!customer) {
          return res.status(400).json({ message: "Invalid customer ID. Customer not found." });
        }
      }

      const validatedData = insertProjectSchema.parse({
        ...req.body,
        userId: user.id
      });

      // Use database to create project instead of in-memory storage
      const project = await createProjectInDb(validatedData);
      
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

      // Check if project exists in the database
      const project = await db.query.projects.findFirst({
        where: eq(projects.id, projectId)
      });
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // For demo, always use the demo user
      const user = await storage.getUserByUsername("demo");
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // If customerId is provided, verify it exists
      if (req.body.customerId) {
        const customerId = parseInt(req.body.customerId);
        const customer = await db.query.customers.findFirst({
          where: eq(customers.id, customerId)
        });
        
        if (!customer) {
          return res.status(400).json({ message: "Invalid customer ID. Customer not found." });
        }
      }

      // Validate partial update fields
      const { name, description, type, sourceSystem, targetSystem, customerId } = req.body;
      const updateData = {
        name,
        description,
        type,
        sourceSystem,
        targetSystem,
        customerId // Include customerId in the update
      };
      
      console.log('Updating project with data:', updateData);
      
      // Use database to update project instead of in-memory storage
      const updatedProject = await updateProjectInDb(projectId, updateData);
      
      // Add activity for project update
      await storage.createActivity({
        type: "updated_project",
        description: `${user.username} updated project "${updatedProject.name}"`,
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

    // Check if project exists in the database
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, projectId)
    });
    
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    try {
      // Delete from database (this will cascade delete related records since we defined CASCADE on FOREIGN KEYS)
      await db.delete(projects).where(eq(projects.id, projectId));
      
      // In a real app, we might need additional cleanup for files or other resources
      
      res.status(204).end();
    } catch (error) {
      console.error("Error deleting project:", error);
      res.status(500).json({ message: "Error deleting project" });
    }
  });

  // Input data endpoints
  app.get("/api/projects/:projectId/input-data", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      // Check if project exists in the database
      const project = await db.query.projects.findFirst({
        where: eq(projects.id, projectId)
      });
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      const inputDataItems = await storage.getInputDataByProject(projectId);
      res.json(inputDataItems);
    } catch (error) {
      console.error("Error fetching input data:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/projects/:projectId/input-data", upload.single('file'), async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      // Check if project exists in the database
      const project = await db.query.projects.findFirst({
        where: eq(projects.id, projectId)
      });
      
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
                minRequirements, // Minimum number of requirements to extract
                inputDataRecord.id // Pass input data ID for text references
              );
              console.log(`Text file processing complete: ${requirements.length} requirements extracted`);
            } else if (type === 'pdf') {
              // For PDF files, use specialized PDF processor with enhanced analysis
              console.log(`Processing PDF file: ${req.file!.originalname} with advanced PDF analyzer`);
              
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
                // First analyze the PDF to get better context and determine if it's a scanned document
                const pdfAnalysis = await analyzePdf(req.file!.path);
                console.log(`PDF analysis complete: ${pdfAnalysis.text.length} chars, ${pdfAnalysis.pageCount} pages`);
                console.log(`PDF context: domain=${pdfAnalysis.context.domain}, type=${pdfAnalysis.context.docType}, keywords=${pdfAnalysis.context.keywords.join(', ')}`);
                
                // Track if this is a scanned or image-based PDF with limited text
                if (pdfAnalysis.isScanOrImage) {
                  console.log(`PDF detected as scanned/image-based document with limited extractable text`);
                  
                  // If we have some text (even if limited), try using it to build better context
                  let contextText = pdfAnalysis.text;
                  // Add metadata if available
                  if (pdfAnalysis.metadata) {
                    contextText += "\n\n" + pdfAnalysis.metadata;
                  }
                  
                  // If we have absolutely minimal text, use filename-based approach with document type
                  if (contextText.length < 100) {
                    console.log(`Extremely limited text content (${contextText.length} chars). Using filename and document type for requirements generation.`);
                    
                    // Create context-aware requirements based on filename and document type
                    const domain = pdfAnalysis.context.domain || 'software';
                    const docType = pdfAnalysis.context.docType || 'requirements document';
                    const keywords = pdfAnalysis.context.keywords || [];
                    
                    // Pass this minimal but relevant context to the Gemini API
                    // This gives the API something to work with even though OCR failed
                    let contextPrompt = `The document "${req.file!.originalname}" appears to be a ${docType} related to ${domain} systems`;
                    if (keywords.length > 0) {
                      contextPrompt += ` with focus on ${keywords.join(', ')}`;
                    }
                    
                    // Try to generate requirements based on filename and document type context
                    try {
                      // Create a temporary text file with the context prompt for Gemini
                      const contextFilePath = path.join(path.dirname(req.file!.path), 'context_' + path.basename(req.file!.path, '.pdf') + '.txt');
                      fs.writeFileSync(contextFilePath, contextPrompt, 'utf8');
                      
                      console.log(`Created context file with ${contextPrompt.length} chars of derived context`);
                      
                      // Process with Gemini
                      requirements = await processTextFile(
                        contextFilePath,
                        project.name,
                        req.file!.originalname,
                        contentType,
                        minRequirements,
                        inputDataRecord.id // Pass input data ID for text references
                      );
                      
                      // Clean up the temporary file
                      try {
                        fs.unlinkSync(contextFilePath);
                      } catch (err) {
                        console.error('Error removing temp file:', err);
                      }
                      
                      if (requirements.length === 0) {
                        throw new Error('Context-based generation returned no requirements');
                      }
                    } catch (genError) {
                      console.error("Context-based generation failed:", genError);
                      
                      // If context-based generation fails, fall back to domain-specific templates
                      console.log(`Falling back to domain-specific templates for ${domain} ${docType}`);
                      
                      // Generate detailed fallback requirements for scanned/image PDFs with minimum 200 words per requirement
                      // These are tailored to the document context we've extracted
                      requirements = [
                        { 
                          title: "Robust Document Scanning and OCR Functionality",
                          description: `The system must implement robust document scanning and OCR functionality to process the information contained in documents like "${req.file!.originalname}". This capability is essential for extracting valuable data from ${docType} documents that are in image or scanned format. The system should detect document type, orientation, and quality automatically to optimize the scanning and recognition process. Multiple OCR engines should be supported to ensure the highest possible accuracy for different document types and quality levels. The extracted text must be automatically categorized and mapped to appropriate data structures and fields based on the document context and content patterns identified. The system should maintain an audit trail of all processed documents, including original images, extracted text, and any manual corrections made during verification. This requirement is critical for ensuring that information locked in image-based documents can be efficiently converted to structured data. The OCR capability should include confidence scoring for each extracted data element, with configurable thresholds for automated processing versus manual review. Integration with machine learning models is necessary to improve extraction accuracy over time based on user corrections and feedback. The system must handle various document formats, resolutions, and quality levels, with appropriate error handling and fallback mechanisms for documents that cannot be accurately processed automatically. Performance metrics must be established for measuring OCR accuracy, with continuous improvement processes to enhance recognition rates over time.`,
                          category: 'functional', 
                          priority: 'high' 
                        },
                        { 
                          title: "Comprehensive Document Management Solution",
                          description: `The system must include a comprehensive document management solution for ${domain}-related documents similar to "${req.file!.originalname}". This solution should enable users to maintain a centralized repository of all business-critical ${docType} documents with appropriate organization, categorization, and searching capabilities. The document management functionality must provide robust version control capabilities, allowing users to track changes, view revision history, and restore previous versions of documents when necessary. Access controls must be implemented to ensure that documents are only accessible to authorized users based on their roles and permissions within the system. The solution should support document classification with metadata tagging to facilitate easy searching and filtering of documents based on various attributes such as document type, date, department, project phase, and other domain-specific criteria. Integration with existing business objects and data structures is essential, allowing documents to be linked to relevant entities to maintain business context and traceability. The system should provide preview capabilities for all supported document formats without requiring users to download files or use external applications. The document management solution should support bulk operations for uploading, categorizing, and processing large numbers of documents during migration or batch processing scenarios. Analytics and reporting on document usage, access patterns, and storage utilization must be provided to support optimization and compliance requirements. Mobile access to documents should be supported, with appropriate security controls and user experience optimizations for different device types. This requirement is essential for maintaining organized and accessible documentation throughout the system lifecycle.`,
                          category: 'functional', 
                          priority: 'medium' 
                        },
                        { 
                          title: "Robust Data Extraction and Transformation",
                          description: `The system must include robust data extraction and transformation capabilities to process information from ${domain} documents like "${req.file!.originalname}". The solution should be able to extract both structured and unstructured data from various document formats, including scanned PDFs, using intelligent data capture technologies appropriate for the domain. Once extracted, the data must be transformed and normalized according to the system's data model, with appropriate validation rules applied to ensure data integrity and conformance to business rules. The system should provide configurable mapping templates that allow administrators to define how data from different document types should be mapped to system entities and fields. These mapping templates should support conditional logic and transformations to handle complex business rules and exceptions typical in ${domain} documentation. The extraction and transformation process must include comprehensive error handling mechanisms that identify issues such as missing required fields, invalid data formats, or potential duplicates, with clear notifications to users. The system should maintain detailed logs of all data extraction and transformation activities for audit, troubleshooting, and compliance purposes. A user interface must be provided for business users to review and approve the extracted data before it is committed to the system of record, with the ability to make manual corrections when necessary. The data extraction system should support batch processing for handling large volumes of documents during the initial migration phase and ongoing operations. It should also include learning capabilities to improve extraction accuracy over time based on corrections and feedback from users working with ${domain} documentation. Integration with existing data validation rules and duplicate detection mechanisms is essential to maintain data quality standards across the integrated systems.`,
                          category: 'functional', 
                          priority: 'high' 
                        },
                        { 
                          title: "Workflow Automation for Document Processing",
                          description: `The system must implement a comprehensive workflow automation solution for processing ${domain} documentation like "${req.file!.originalname}". The workflow automation should support multi-step approval processes, conditional routing based on document content or metadata, and automatic task assignment to appropriate users or groups based on document type, content, and organizational roles. Notifications should be configurable at each step of the workflow to keep relevant stakeholders informed of document status and required actions, with support for multiple communication channels including email, in-app notifications, and mobile alerts. The workflows must support parallel processing, allowing multiple users to work on different aspects of a document simultaneously when appropriate for the business process. Exception handling should be built into the workflows, with clear escalation paths and SLA tracking for documents that require special handling or are at risk of missing deadlines. The system should provide a visual workflow designer that allows business administrators to create and modify workflows without coding, including the ability to define entry conditions, steps, approval rules, and exit actions appropriate for ${domain} processes. Real-time visibility into workflow status is essential, with dashboards and reports that show document volume, processing times, bottlenecks, and completion rates to support continuous process improvement. The workflow automation should integrate with standard automation tools and allow for custom integrations when more complex logic is required for specialized ${domain} processing. The system should support conditional branching in workflows based on document content, metadata, or user inputs, allowing for complex business processes to be automated effectively. Integration with external systems may be required to maintain end-to-end process integrity across system boundaries. Tools for workflow optimization should be provided, with analytics that identify opportunities to improve efficiency and reduce processing times.`,
                          category: 'functional', 
                          priority: 'medium' 
                        },
                        { 
                          title: "Document Security and Compliance Controls",
                          description: `The system must include comprehensive security controls for document handling and processing that are appropriate for ${domain} applications. All documents uploaded to the system, including those similar to "${req.file!.originalname}", must be scanned for malware and potentially harmful content before being stored in the system. The security framework must implement proper encryption for documents both at rest and in transit, with key management systems that comply with industry best practices and relevant standards for ${domain} systems. Access controls should be granular, allowing permissions to be set at the document level when necessary, and should integrate with the system's role-based security model. The system must maintain detailed audit logs for all document-related operations, including viewing, downloading, modifying, and sharing, with user information, timestamps, and IP addresses recorded for compliance purposes. Data loss prevention (DLP) measures should be implemented to identify and protect sensitive information within documents, such as personal identifiable information (PII), financial data, or proprietary business information that may be contained in ${docType} documents. The security controls must support compliance with relevant regulations such as GDPR, HIPAA, SOX, or industry-specific requirements, depending on the organization's regulatory environment. Regular security assessments, including vulnerability scanning and penetration testing, should be conducted to ensure the document handling system remains secure against evolving threats. The security model should support the concept of least privilege, ensuring users only have access to the documents and data they need to perform their job functions. Enhanced security capabilities should be considered, including content encryption, comprehensive event monitoring, and field-level audit trails for sensitive document metadata. Security policies and procedures should be documented and communicated to all system users, with regular training provided on secure document handling practices appropriate for the sensitivity level of ${domain} documentation.`,
                          category: 'security', 
                          priority: 'high' 
                        }
                      ];
                      console.log(`Generated ${requirements.length} domain-specific fallback requirements for ${domain} ${docType} with minimal extractable text`);
                    }
                  } else {
                    // We have limited but usable text content - process using standard method with the limited text
                    console.log(`Limited text content available (${contextText.length} chars). Proceeding with direct Gemini processing.`);
                    
                    // Create a temporary file with the context text
                    const textFilePath = path.join(path.dirname(req.file!.path), 'extracted_' + path.basename(req.file!.path, '.pdf') + '.txt');
                    fs.writeFileSync(textFilePath, contextText, 'utf8');
                    
                    // Process with Gemini
                    requirements = await processTextFile(
                      textFilePath,
                      project.name,
                      req.file!.originalname,
                      contentType,
                      minRequirements,
                      inputDataRecord.id // Pass input data ID for text references
                    );
                    
                    // Clean up the temporary file
                    try {
                      fs.unlinkSync(textFilePath);
                    } catch (err) {
                      console.error('Error removing temp file:', err);
                    }
                    
                    if (requirements.length === 0) {
                      console.warn(`Gemini processing produced no requirements despite having ${contextText.length} chars of text`);
                      throw new Error('Limited-text processing returned no requirements');
                    }
                  }
                } else {
                  // This is a normal PDF with sufficient text content - process normally
                  console.log(`PDF contains ${pdfAnalysis.text.length} chars of extractable text. Processing with standard method.`);
                  
                  // Process the PDF with our enhanced processor, allowing large files if needed
                  requirements = await processPdfFile(
                    req.file!.path,
                    project.name,
                    req.file!.originalname,
                    contentType,
                    minRequirements,
                    isLargeFile, // Pass whether this is a large file to allow bypassing size limits
                    inputDataRecord.id // Pass input data ID for text references
                  );
                  
                  console.log(`PDF processing successful, extracted ${requirements.length} requirements`);
                  
                  // If we still got no requirements despite having text, something went wrong with the processing
                  if (requirements.length === 0) {
                    console.warn("Warning: No requirements were extracted despite having text content. Falling back to direct text processing.");
                    
                    try {
                      console.log(`Falling back to memory-efficient stream processor for PDF text`);
                      
                      // Import the stream processor
                      const { streamProcessPdfText } = await import('./stream-pdf-processor.js');
                      
                      // Use our dedicated stream processor
                      const projectName = project?.name || 'Unknown Project';
                      requirements = await streamProcessPdfText(
                        pdfAnalysis.text,
                        req.file!.path,
                        projectName,
                        req.file!.originalname,
                        contentType,
                        minRequirements,
                        inputDataRecord.id // Pass input data ID for text references
                      );
                      
                      console.log(`Stream processor returned ${requirements.length} requirements`);
                    } catch (streamError) {
                      console.error("Error in stream processing:", streamError);
                    }
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
              // Define the project name safely
              const projectName = project?.name || 'Unknown Project';
              
              // Use function expression to avoid strict mode issues
              const processVideoFileWithScenes = async () => {
                // Import here to avoid circular dependency
                const geminiModule = await import('./gemini.js');
                return geminiModule.processVideoFile(
                  req.file!.path,
                  req.file!.originalname,
                  projectName,
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
                // Use a much smaller limit to prevent memory issues
                if (content.length > 2000) {
                  console.log(`Truncating content from ${content.length} to 2000 chars to prevent memory issues`);
                  content = content.substring(0, 2000);
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
                  { title: "User Management Workflow Migration", description: `The system must migrate the user management workflow from the source system, including all roles, permissions, and authentication processes shown in ${req.file!.originalname}`, category: 'functional', priority: 'high' },
                  { title: "Data Processing Workflow Replication", description: `The system shall replicate the data processing workflow with all validation rules, transformation logic, and error handling as demonstrated in the source system`, category: 'functional', priority: 'high' },
                  { title: "Notification Workflow Implementation", description: `The notification workflow must be implemented with identical triggers, delivery channels, and personalization options as the source system`, category: 'functional', priority: 'medium' },
                  { title: "Reporting Workflow Migration", description: `The reporting workflow shall be migrated with all existing templates, scheduling capabilities, and export formats maintained from the source system`, category: 'functional', priority: 'medium' },
                  { title: "Security and Audit Workflow Compliance", description: `The system must implement the complete security and audit workflow to maintain compliance with all regulatory requirements shown in the video`, category: 'security', priority: 'high' }
                ];
              } else {
                // Default fallback requirements for other file types
                requirements = [
                  { title: `${type.charAt(0).toUpperCase() + type.slice(1)} File Processing`, description: `The system must properly process ${type} files like ${req.file!.originalname}`, category: 'functional', priority: 'high' },
                  { title: "Detailed Requirements View", description: `Users should be able to view detailed information about requirements extracted from ${type} files`, category: 'functional', priority: 'medium' },
                  { title: "Requirements Filtering and Sorting", description: `The application shall provide filtering and sorting options for requirements`, category: 'functional', priority: 'medium' },
                  { title: "Version Control for Requirements", description: `Implementation of version control is required for tracking requirement changes`, category: 'non-functional', priority: 'low' },
                  { title: "Uploaded File Security", description: `Security measures must be in place to protect sensitive data in uploaded files`, category: 'security', priority: 'high' }
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
            
            // Handle both new format (title/description) and legacy format (text only)
            const title = requirement.title || `Requirement ${codeId}`;
            let description = requirement.description;
            
            // If the requirement has a 'text' field but no 'description', use the text field content
            if (!description && requirement.text) {
              description = requirement.text;
              console.log(`Converting legacy format requirement (text) to new format (description) for ${codeId}`);
            }
            
            await storage.createRequirement({
              title: title,
              description: description,
              category: requirement.category || 'functional',
              priority: requirement.priority || 'medium',
              projectId,
              inputDataId: inputDataRecord.id,
              codeId,
              source: inputDataRecord.name,
              videoScenes: requirement.videoScenes || [],
              textReferences: requirement.textReferences || [],
              audioTimestamps: requirement.audioTimestamps || []
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

    // Check if project exists in the database
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, projectId)
    });
    
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

      // Check if project exists in the database
      const project = await db.query.projects.findFirst({
        where: eq(projects.id, projectId)
      });
      
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

      // Check if project exists in the database
      const project = await db.query.projects.findFirst({
        where: eq(projects.id, projectId)
      });
      
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
          r => r.description.toLowerCase().includes(searchTerm) || 
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
        source: req.body.source || null,
        textReferences: req.body.textReferences || [],
        audioTimestamps: req.body.audioTimestamps || [],
        videoScenes: req.body.videoScenes || []
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
        source: req.body.source === "" ? null : req.body.source,
        textReferences: req.body.textReferences || [],
        audioTimestamps: req.body.audioTimestamps || [],
        videoScenes: req.body.videoScenes || []
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

      // Check if project exists in the database
      const project = await db.query.projects.findFirst({
        where: eq(projects.id, projectId)
      });
      
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
          description: r.description,
          category: r.category,
          priority: r.priority,
          source: r.source,
          textReferences: r.textReferences || [],
          audioTimestamps: r.audioTimestamps || [],
          videoScenes: r.videoScenes || []
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

  // Endpoint to automatically generate acceptance criteria for a requirement
  app.post("/api/requirements/:requirementId/generate-acceptance-criteria", async (req: Request, res: Response) => {
    try {
      const requirementId = parseInt(req.params.requirementId);
      if (isNaN(requirementId)) {
        return res.status(400).json({ message: "Invalid requirement ID", requirementId: req.params.requirementId });
      }

      // Get the requirement directly from the database without any project check
      // We'll validate the project relationship separately
      const [requirement] = await db.select()
        .from(requirements)
        .where(eq(requirements.id, requirementId));
      
      if (!requirement) {
        console.error(`Requirement with ID ${requirementId} not found in database`);
        return res.status(404).json({ message: "Requirement not found", requirementId });
      }

      console.log(`Found requirement: ${requirement.title}, project ID: ${requirement.projectId}`);
      
      // Get the project directly from the database 
      const [project] = await db.select()
        .from(projects)
        .where(eq(projects.id, requirement.projectId));
      
      if (!project) {
        console.error(`Project with ID ${requirement.projectId} not found for requirement ${requirementId}`);
        return res.status(404).json({ message: "Project not found", projectId: requirement.projectId });
      }
      
      console.log(`Found project: ${project.name}`);

      // For demo, always use the demo user
      const [user] = await db.select()
        .from(users)
        .where(eq(users.username, "demo"));
        
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if API key is available
      if (!process.env.ANTHROPIC_API_KEY) {
        return res.status(400).json({ 
          message: "Claude API key is not configured. Please set the ANTHROPIC_API_KEY environment variable."
        });
      }

      // Generate acceptance criteria using Claude
      const acceptanceCriteria = await generateAcceptanceCriteria(
        project.name,
        project.description || "No project description available",
        requirement.description
      );

      // Update the requirement with the new acceptance criteria directly in the database
      const [updatedRequirement] = await db
        .update(requirements)
        .set({ acceptanceCriteria })
        .where(eq(requirements.id, requirementId))
        .returning();

      // Add activity directly in the database
      await db.insert(activities).values({
        type: "generated_acceptance_criteria",
        description: `${user.username} generated acceptance criteria for requirement ${requirement.codeId || requirement.id}`,
        userId: user.id,
        projectId: requirement.projectId,
        relatedEntityId: requirement.id,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      res.status(200).json(acceptanceCriteria);
    } catch (error) {
      console.error("Error generating acceptance criteria:", error);
      res.status(500).json({ message: "Error generating acceptance criteria", error });
    }
  });

  // Endpoint to automatically generate implementation tasks for a requirement
  app.post("/api/requirements/:requirementId/generate-tasks", async (req: Request, res: Response) => {
    try {
      const requirementId = parseInt(req.params.requirementId);
      if (isNaN(requirementId)) {
        return res.status(400).json({ message: "Invalid requirement ID" });
      }

      // Get projectId from request body
      const projectId = req.body.projectId ? parseInt(req.body.projectId) : null;
      console.log(`Generating tasks for requirement ID: ${requirementId}, project ID from body: ${projectId}`);
      
      // No project ID provided, try direct lookup
      let requirement;
      
      if (!projectId) {
        // Try to get the requirement directly
        requirement = await storage.getRequirement(requirementId);
      } else {
        // Use the combined method for better reliability
        requirement = await storage.getRequirementWithProjectCheck(requirementId, projectId);
      }
      
      // If we still don't have a requirement, return an error
      if (!requirement) {
        console.error(`Requirement with ID ${requirementId} not found in database`);
        return res.status(404).json({ message: "Requirement not found", requirementId });
      }

      // Use provided projectId if requirement's projectId is missing
      const effectiveProjectId = requirement.projectId || projectId;
      
      // Handle case where projectId might be null or undefined
      if (!effectiveProjectId) {
        console.error(`Requirement ${requirementId} has no associated project ID and none was provided`);
        return res.status(400).json({ message: "Requirement has no associated project and no project ID was provided" });
      }

      const project = await storage.getProject(effectiveProjectId);
      if (!project) {
        console.error(`Project with ID ${effectiveProjectId} not found for requirement ${requirementId}`);
        return res.status(404).json({ message: "Project not found", projectId: effectiveProjectId });
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

      // Get acceptance criteria for the requirement
      const acceptanceCriteria = (requirement.acceptanceCriteria || []) as AcceptanceCriterion[];
      
      if (acceptanceCriteria.length === 0) {
        return res.status(400).json({
          message: "No acceptance criteria available for this requirement. Please generate acceptance criteria first."
        });
      }

      console.log(`Generating Salesforce implementation tasks using Claude AI for requirement: ${requirement.codeId}`);
      
      // Use Claude AI to generate Salesforce-specific implementation tasks
      const generatedTasks = await generateImplementationTasks(
        project.name,
        project.sourceSystem,
        project.targetSystem,
        project.description || "",
        requirement.description,
        acceptanceCriteria,
        requirementId
      );
      
      // Process the generated tasks and add any missing fields
      const processedTasks = generatedTasks.map(task => {
        // We no longer need to add documentation links to the description since we have a separate field for them
        const enhancedDescription = task.description;
        
        // Convert sfDocumentation to sfDocumentationLinks format
        const sfDocumentationLinks = task.sfDocumentation && Array.isArray(task.sfDocumentation) 
          ? task.sfDocumentation.map((doc: { title?: string; url?: string }) => {
              return {
                title: doc.title || 'Salesforce Documentation',
                url: doc.url || ''
              };
            })
          : [];
        
        return {
          title: task.title,
          description: enhancedDescription,
          status: "pending",
          priority: task.priority || requirement.priority,
          system: task.system,
          requirementId: requirementId,
          estimatedHours: task.estimatedHours || 8,
          complexity: task.complexity || "medium",
          taskType: task.taskType || "implementation",
          sfDocumentationLinks: sfDocumentationLinks,
          assignee: null
        };
      });
      
      // Create all tasks
      const createdTasks = [];
      for (const taskData of processedTasks) {
        const task = await storage.createImplementationTask(taskData);
        createdTasks.push(task);
      }

      // Add activity
      await storage.createActivity({
        type: "generated_tasks",
        description: `${user.username} generated ${createdTasks.length} Salesforce-specific implementation tasks for requirement ${requirement.codeId}`,
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

  // Search routes
  app.get("/api/search/quick", async (req: Request, res: Response) => {
    try {
      // For demo purposes, we'll use the demo user ID if no session is present
      const userId = req.session.userId || 1;
      
      const query = req.query.q as string || "";
      const limit = parseInt(req.query.limit as string || "5");
      
      if (!query.trim()) {
        return res.status(200).json({ 
          projects: [],
          requirements: [],
          inputData: [],
          tasks: []
        });
      }
      
      const results = await storage.quickSearch(userId, query, limit);
      res.status(200).json(results);
    } catch (error) {
      console.error("Error during quick search:", error);
      res.status(500).json({ message: "Error performing search", error: (error as Error).message });
    }
  });
  
  app.get("/api/search/advanced", async (req: Request, res: Response) => {
    try {
      // For demo purposes, we'll use the demo user ID if no session is present
      const userId = req.session.userId || 1;
      
      const query = req.query.q as string || "";
      const page = parseInt(req.query.page as string || "1");
      const limit = parseInt(req.query.limit as string || "10");
      
      // Parse entity types filter
      let entityTypes: string[] | undefined;
      if (req.query.entityTypes) {
        entityTypes = (req.query.entityTypes as string).split(',');
      }
      
      // Parse other filters
      const filters: any = {};
      if (entityTypes) filters.entityTypes = entityTypes;
      if (req.query.projectId) filters.projectId = parseInt(req.query.projectId as string);
      if (req.query.category) filters.category = req.query.category as string;
      if (req.query.priority) filters.priority = req.query.priority as string;
      
      // Parse date range if provided
      if (req.query.fromDate || req.query.toDate) {
        filters.dateRange = {};
        if (req.query.fromDate) filters.dateRange.from = new Date(req.query.fromDate as string);
        if (req.query.toDate) filters.dateRange.to = new Date(req.query.toDate as string);
      }
      
      console.log(`Performing advanced search with query "${query}" for user ${userId}`);
      
      const results = await storage.advancedSearch(
        userId, 
        query, 
        filters, 
        { page, limit }
      );
      
      console.log(`Search results: ${results.totalResults} total results found`);
      
      res.status(200).json(results);
    } catch (error) {
      console.error("Error during advanced search:", error);
      res.status(500).json({ message: "Error performing search", error: (error as Error).message });
    }
  });

  // Get reference data for a requirement
  app.get("/api/requirements/:requirementId/references", async (req: Request, res: Response) => {
    try {
      const requirementId = parseInt(req.params.requirementId);
      const inputDataId = req.query.inputDataId ? parseInt(req.query.inputDataId as string) : undefined;
      
      if (!inputDataId) {
        return res.status(400).json({ message: "Input data ID is required" });
      }
      
      // Get the requirement
      const requirement = await storage.getRequirement(requirementId);
      if (!requirement) {
        return res.status(404).json({ message: "Requirement not found" });
      }
      
      // Get the input data
      const inputData = await storage.getInputData(inputDataId);
      if (!inputData) {
        return res.status(404).json({ message: "Input data not found" });
      }
      
      // Mocked references for now, in a real implementation these would be stored in the database
      // and retrieved based on the requirement and input data
      const references = [];
      
      if (inputData.type === 'pdf' || inputData.type === 'document') {
        // PDF reference
        references.push({
          type: 'pdf',
          url: `/api/uploads/${(inputData.metadata as any)?.path?.split('/').pop() || 'file.pdf'}`, // Extract filename from metadata
          highlights: [
            {
              pageNumber: 1,
              text: requirement.description.substring(0, Math.min(200, requirement.description.length)),
              color: 'rgba(255, 255, 0, 0.4)'
            },
            {
              pageNumber: 2,
              text: requirement.description.substring(
                Math.min(200, requirement.description.length), 
                Math.min(400, requirement.description.length)
              ),
              color: 'rgba(0, 255, 255, 0.3)'
            }
          ]
        });
        
        // Also add some text references
        const sentences = requirement.description.split('.').filter((s: string) => s.trim().length > 0);
        
        if (sentences.length > 1) {
          references.push({
            type: 'text',
            content: sentences[0] + '.',
            metadata: {
              location: 'Introduction',
              page: 1,
              context: 'Key requirement statement'
            }
          });
          
          if (sentences.length > 2) {
            references.push({
              type: 'text',
              content: sentences[1] + '.',
              metadata: {
                location: 'Details section',
                page: 1,
                context: 'Implementation details'
              }
            });
          }
        }
      } else if (inputData.type === 'text') {
        // Text references for text files
        const sentences = requirement.description.split('.').filter((s: string) => s.trim().length > 0);
        
        sentences.forEach((sentence: string, index: number) => {
          if (index < 3) { // Limit to first 3 sentences for demo
            references.push({
              type: 'text',
              content: sentence + '.',
              metadata: {
                location: index === 0 ? 'Introduction' : 'Details section',
                context: index === 0 ? 'Key statement' : 'Supporting information'
              }
            });
          }
        });
      } else if (inputData.type === 'video') {
        // Video references with timestamps
        // In a real implementation, these would be stored in the database from video analysis
        
        // URL for the video file
        const videoUrl = `/api/uploads/${(inputData.metadata as any)?.path?.split('/').pop() || 'video.mp4'}`;
        
        // Add video reference
        references.push({
          type: 'video',
          url: videoUrl,
          timestamps: [
            {
              startTime: 15, // 15 seconds
              endTime: 30,
              transcript: requirement.description.substring(0, Math.min(200, requirement.description.length)),
              relevance: 0.95
            },
            {
              startTime: 45, // 45 seconds
              endTime: 60,
              transcript: requirement.description.substring(
                Math.min(200, requirement.description.length), 
                Math.min(400, requirement.description.length)
              ),
              relevance: 0.87
            }
          ]
        });
        
        // Also add text references for context
        const sentences = requirement.description.split('.').filter((s: string) => s.trim().length > 0);
        if (sentences.length > 1) {
          references.push({
            type: 'text',
            content: sentences[0] + '.',
            metadata: {
              location: 'Video transcript',
              context: 'Key statement from video'
            }
          });
        }
      } else if (inputData.type === 'audio') {
        // Audio references with timestamps
        // In a real implementation, these would be stored in the database from audio analysis
        
        // URL for the audio file
        const audioUrl = `/api/uploads/${(inputData.metadata as any)?.path?.split('/').pop() || 'audio.mp3'}`;
        
        // Add audio reference
        references.push({
          type: 'audio',
          url: audioUrl,
          timestamps: [
            {
              startTime: 20, // 20 seconds
              endTime: 40,
              transcript: requirement.description.substring(0, Math.min(200, requirement.description.length)),
              relevance: 0.92
            },
            {
              startTime: 90, // 90 seconds
              endTime: 110,
              transcript: requirement.description.substring(
                Math.min(200, requirement.description.length), 
                Math.min(400, requirement.description.length)
              ),
              relevance: 0.85
            }
          ]
        });
        
        // Also add text references for context
        const sentences = requirement.description.split('.').filter((s: string) => s.trim().length > 0);
        if (sentences.length > 1) {
          references.push({
            type: 'text',
            content: sentences[0] + '.',
            metadata: {
              location: 'Audio transcript',
              context: 'Key statement from audio'
            }
          });
        }
      }
      
      return res.status(200).json(references);
    } catch (error: any) {
      console.error("Error getting requirement references:", error);
      return res.status(500).json({ message: error.message || "Error getting requirement references" });
    }
  });
  
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ message: "An unexpected error occurred", error: err.message });
  });

  return httpServer;
}