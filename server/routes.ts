import express, { type Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { createProjectInDb, updateProjectInDb } from "./database";
import documentTemplateRoutes from './routes/document-templates';
import documentRoutes from './routes/documents';
import pdfRoutes from './routes/pdf-route';
import projectRolesRoutes from './routes/project-roles';
import { requirementRoleEffortController } from './controllers/requirement-role-effort-controller';
import { taskRoleEffortController } from './controllers/task-role-effort-controller';
import { 
  insertProjectSchema, 
  insertInputDataSchema, 
  insertRequirementSchema,
  insertActivitySchema,
  insertImplementationTaskSchema,
  insertUserSchema,
  insertInviteSchema,
  insertCustomerSchema,
  insertDocumentTemplateSchema,
  insertDocumentSchema,
  insertFieldMappingSchema,
  insertWorkflowSchema,
  customers,
  projects,
  requirements,
  activities,
  users,
  implementationTasks,
  documentTemplates,
  documents,
  fieldMappings
} from "@shared/schema";
import { eq, asc, desc, and, like, inArray } from "drizzle-orm";
import { AcceptanceCriterion, WorkflowNode, WorkflowEdge } from "@shared/types";
import multer from "multer";
import path from "path";
import fs from "fs";
import os from "os";
import nlp from "compromise";
import { processTextFile, generateRequirementsForFile, generateExpertReview } from "./gemini";
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
  
  // Database schema endpoint for template field mappings
  app.get("/api/database-schema", (req, res) => {
    try {
      // Define table metadata with friendly display names and available columns
      const tableSchema = {
        users: {
          displayName: 'Users',
          description: 'System users information',
          columns: {
            id: { type: 'number', description: 'User ID' },
            username: { type: 'string', description: 'Username' },
            firstName: { type: 'string', description: 'First Name' },
            lastName: { type: 'string', description: 'Last Name' },
            email: { type: 'string', description: 'Email Address' },
            company: { type: 'string', description: 'Company Name' },
            role: { type: 'string', description: 'User Role' },
          }
        },
        customers: {
          displayName: 'Customers',
          description: 'Customer organizations',
          columns: {
            id: { type: 'number', description: 'Customer ID' },
            name: { type: 'string', description: 'Customer Name' },
            description: { type: 'string', description: 'Description' },
            industry: { type: 'string', description: 'Industry' },
            backgroundInfo: { type: 'string', description: 'Background Information' },
            website: { type: 'string', description: 'Website URL' },
            contactEmail: { type: 'string', description: 'Contact Email' },
            contactPhone: { type: 'string', description: 'Contact Phone' },
          }
        },
        projects: {
          displayName: 'Projects',
          description: 'Projects information',
          columns: {
            id: { type: 'number', description: 'Project ID' },
            name: { type: 'string', description: 'Project Name' },
            description: { type: 'string', description: 'Description' },
            type: { type: 'string', description: 'Project Type' },
            customer: { type: 'string', description: 'Customer Name' },
            sourceSystem: { type: 'string', description: 'Source System' },
            targetSystem: { type: 'string', description: 'Target System' },
          }
        },
        requirements: {
          displayName: 'Requirements',
          description: 'Project requirements',
          columns: {
            id: { type: 'number', description: 'Requirement ID' },
            title: { type: 'string', description: 'Title' },
            description: { type: 'string', description: 'Description' },
            category: { type: 'string', description: 'Category' },
            priority: { type: 'string', description: 'Priority' },
            codeId: { type: 'string', description: 'Code ID' },
            source: { type: 'string', description: 'Source' },
          }
        },
        implementationTasks: {
          displayName: 'Implementation Tasks',
          description: 'Tasks for implementing requirements',
          columns: {
            id: { type: 'number', description: 'Task ID' },
            title: { type: 'string', description: 'Title' },
            description: { type: 'string', description: 'Description' },
            status: { type: 'string', description: 'Status' },
            priority: { type: 'string', description: 'Priority' },
            system: { type: 'string', description: 'System' },
            complexity: { type: 'string', description: 'Complexity' },
            assignee: { type: 'string', description: 'Assignee' },
            taskType: { type: 'string', description: 'Task Type' },
          }
        }
      };
      
      // Wrap the tableSchema in a 'tables' object to match the frontend's expected format
      return res.json({ tables: tableSchema });
    } catch (error) {
      console.error('Error fetching database schema:', error);
      return res.status(500).json({ error: 'Failed to fetch database schema information' });
    }
  });

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
      console.log("POST /api/customers request body:", req.body);
      
      const customerData = insertCustomerSchema.parse(req.body);
      console.log("Parsed customer data:", customerData);
      
      const result = await db.insert(customers).values(customerData).returning();
      console.log("Customer created successfully:", result[0]);
      
      res.status(201).json(result[0]);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Validation error creating customer:", error.errors);
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
      
      // Return a success response with status 200 instead of 204 (no content)
      res.status(200).json({ 
        message: "Project deleted successfully",
        projectId: projectId 
      });
    } catch (error) {
      console.error("Error deleting project:", error);
      res.status(500).json({ message: "Error deleting project" });
    }
  });

  // Workflow routes
  app.get("/api/projects/:projectId/workflows", async (req: Request, res: Response) => {
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

      const workflows = await storage.getWorkflowsByProject(projectId);
      res.json(workflows);
    } catch (error) {
      console.error("Error fetching workflows:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/workflows/:id", async (req: Request, res: Response) => {
    try {
      const workflowId = parseInt(req.params.id);
      if (isNaN(workflowId)) {
        return res.status(400).json({ message: "Invalid workflow ID" });
      }

      const workflow = await storage.getWorkflow(workflowId);
      if (!workflow) {
        return res.status(404).json({ message: "Workflow not found" });
      }

      res.json(workflow);
    } catch (error) {
      console.error("Error fetching workflow:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/projects/:projectId/workflows", async (req: Request, res: Response) => {
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

      // Validate the workflow data
      const workflowData = insertWorkflowSchema.parse({
        ...req.body,
        projectId // Override with the path parameter
      });

      const newWorkflow = await storage.createWorkflow(workflowData);
      
      // Log the creation of a new workflow as an activity
      await storage.createActivity({
        type: "created_workflow",
        description: `Created workflow "${newWorkflow.name}"`,
        userId: req.session.userId || 1, // Use demo user if not logged in
        projectId,
        relatedEntityId: newWorkflow.id
      });

      res.status(201).json(newWorkflow);
    } catch (error) {
      console.error("Error creating workflow:", error);
      res.status(400).json({ message: "Invalid workflow data", error });
    }
  });

  app.put("/api/workflows/:id", async (req: Request, res: Response) => {
    try {
      const workflowId = parseInt(req.params.id);
      if (isNaN(workflowId)) {
        return res.status(400).json({ message: "Invalid workflow ID" });
      }

      // Check if workflow exists
      const existingWorkflow = await storage.getWorkflow(workflowId);
      if (!existingWorkflow) {
        return res.status(404).json({ message: "Workflow not found" });
      }

      // Validate the update data
      const workflowData = insertWorkflowSchema.partial().parse(req.body);

      // Update the workflow
      const updatedWorkflow = await storage.updateWorkflow(workflowId, workflowData);
      if (!updatedWorkflow) {
        return res.status(500).json({ message: "Failed to update workflow" });
      }

      // Log the update as an activity
      await storage.createActivity({
        type: "updated_workflow",
        description: `Updated workflow "${updatedWorkflow.name}"`,
        userId: req.session.userId || 1, // Use demo user if not logged in
        projectId: updatedWorkflow.projectId,
        relatedEntityId: updatedWorkflow.id
      });

      res.json(updatedWorkflow);
    } catch (error) {
      console.error("Error updating workflow:", error);
      res.status(400).json({ message: "Invalid workflow data", error });
    }
  });

  app.delete("/api/workflows/:id", async (req: Request, res: Response) => {
    try {
      const workflowId = parseInt(req.params.id);
      if (isNaN(workflowId)) {
        return res.status(400).json({ message: "Invalid workflow ID" });
      }

      // Check if workflow exists
      const existingWorkflow = await storage.getWorkflow(workflowId);
      if (!existingWorkflow) {
        return res.status(404).json({ message: "Workflow not found" });
      }

      // Delete the workflow
      const success = await storage.deleteWorkflow(workflowId);
      if (!success) {
        return res.status(500).json({ message: "Failed to delete workflow" });
      }

      // Log the deletion as an activity
      await storage.createActivity({
        type: "deleted_workflow",
        description: `Deleted workflow "${existingWorkflow.name}"`,
        userId: req.session.userId || 1, // Use demo user if not logged in
        projectId: existingWorkflow.projectId,
        relatedEntityId: null
      });

      res.json({ message: "Workflow deleted successfully" });
    } catch (error) {
      console.error("Error deleting workflow:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Generate workflow from requirements tagged with "workflow"
  app.post("/api/projects/:projectId/generate-workflow", async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      // Check if project exists
      const project = await db.query.projects.findFirst({
        where: eq(projects.id, projectId)
      });
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Get specific requirements if IDs were provided, otherwise get all workflow category requirements
      let workflowRequirements;
      
      if (req.body.requirementIds && Array.isArray(req.body.requirementIds) && req.body.requirementIds.length > 0) {
        // Get the specified requirements with their acceptance criteria
        workflowRequirements = await db.query.requirements.findMany({
          where: and(
            eq(requirements.projectId, projectId),
            inArray(requirements.id, req.body.requirementIds)
          )
        });
      } else {
        // Get all requirements with the "workflow" category and their acceptance criteria
        workflowRequirements = await db.query.requirements.findMany({
          where: and(
            eq(requirements.projectId, projectId),
            eq(requirements.category, "workflow")
          )
        });
      }

      if (workflowRequirements.length === 0) {
        return res.status(404).json({ 
          message: "No workflow requirements found",
          detail: "Add requirements with the 'Workflow' category to generate a workflow"
        });
      }

      // Create a new workflow with default structure
      const workflowName = req.body.name || `${project.name} Workflow`;
      
      let nodes: WorkflowNode[] = [];
      let edges: WorkflowEdge[] = [];
      
      // For Claude-based workflow generation, we'll use a single requirement with its acceptance criteria
      // If multiple requirements are selected, we'll use the first one for simplicity
      const primaryRequirement = workflowRequirements[0];
      
      // Check for Anthropic API key
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        console.error('Missing ANTHROPIC_API_KEY environment variable');
        return res.status(500).json({ 
          message: "Missing API key",
          detail: "Claude API key is not configured. Please set the ANTHROPIC_API_KEY environment variable."
        });
      }
      
      // Try to generate workflow using the workflow service
      try {
        // Import the workflow service
        const { generateWorkflowDiagram } = await import('./services/workflow-service');
        
        // Call the service to generate the workflow
        console.log(`Generating workflow diagram with Claude for ${primaryRequirement.title}...`);
        const workflowJson = await generateWorkflowDiagram(primaryRequirement);
        
        // Transform Claude's output to our WorkflowNode and WorkflowEdge format
        if (workflowJson && workflowJson.nodes && workflowJson.edges) {
          // Map Claude's nodes to our format
          const mappedNodes = workflowJson.nodes.map((node: any) => {
            // Map Claude's nodeType to our node type format
            let nodeType = 'task'; // Default to task
            switch (node.data.nodeType) {
              case 'Start Event': nodeType = 'start'; break;
              case 'End Event': nodeType = 'end'; break;
              case 'Task': nodeType = 'task'; break;
              case 'Subprocess': nodeType = 'subprocess'; break;
              case 'Decision': nodeType = 'decision'; break;
              case 'Parallel GW': nodeType = 'parallel'; break;
              case 'User Task': nodeType = 'userTask'; break;
              case 'Wait / Delay': nodeType = 'wait'; break;
              case 'Message Event': nodeType = 'message'; break;
              case 'Error Event': nodeType = 'error'; break;
              case 'Annotation': nodeType = 'annotation'; break;
            }
            
            return {
              id: node.id,
              type: nodeType,
              // Initially set position to origin, will be arranged by layout algorithm
              position: { x: 0, y: 0 },
              data: {
                label: node.data.label,
                description: node.data.justification,
                requirementId: primaryRequirement.id,
                properties: {
                  justification: node.data.justification
                }
              }
            };
          });
          
          // Map Claude's edges to our format
          const mappedEdges = workflowJson.edges.map((edge: any) => {
            return {
              id: edge.id,
              source: edge.source,
              target: edge.target,
              label: edge.label || '',
              type: edge.type === 'smoothstep' ? 'default' : edge.type || 'default',
              animated: false
            };
          });
          
          // Apply layout algorithm to the nodes
          // We'll use a simple hierarchical layout (top to bottom)
          
          // Step 1: Build a graph structure from nodes and edges
          type GraphNode = {
            id: string;
            nodeData: any;
            outgoingEdges: string[]; // target node IDs
            incomingEdges: string[]; // source node IDs
            level?: number; // Level in the hierarchy (distance from start)
            column?: number; // Column in the layout
          };
          
          const graph: Record<string, GraphNode> = {};
          
          // Initialize graph with nodes
          mappedNodes.forEach(node => {
            graph[node.id] = {
              id: node.id,
              nodeData: node,
              outgoingEdges: [],
              incomingEdges: [],
            };
          });
          
          // Add edge information to the graph
          mappedEdges.forEach(edge => {
            if (graph[edge.source]) {
              graph[edge.source].outgoingEdges.push(edge.target);
            }
            if (graph[edge.target]) {
              graph[edge.target].incomingEdges.push(edge.source);
            }
          });
          
          // Step 2: Find start and end nodes (sources and sinks)
          const startNodes: string[] = [];
          const endNodes: string[] = [];
          
          Object.keys(graph).forEach(nodeId => {
            const node = graph[nodeId];
            
            // Node with no incoming edges is a source/start
            if (node.incomingEdges.length === 0) {
              startNodes.push(nodeId);
            }
            
            // Node with no outgoing edges is a sink/end
            if (node.outgoingEdges.length === 0) {
              endNodes.push(nodeId);
            }
          });
          
          // Step 3: Assign levels to nodes (distance from start)
          // Start with start nodes at level 0
          startNodes.forEach(nodeId => {
            graph[nodeId].level = 0;
          });
          
          // Breadth-first traversal to assign levels
          const queue = [...startNodes];
          const visited = new Set<string>(startNodes);
          
          while (queue.length > 0) {
            const currentId = queue.shift()!;
            const currentNode = graph[currentId];
            
            currentNode.outgoingEdges.forEach(targetId => {
              const targetNode = graph[targetId];
              
              // Update level if not set or if new level is higher
              const newLevel = (currentNode.level || 0) + 1;
              if (targetNode.level === undefined || newLevel > targetNode.level) {
                targetNode.level = newLevel;
              }
              
              // Add to queue if not visited
              if (!visited.has(targetId)) {
                queue.push(targetId);
                visited.add(targetId);
              }
            });
          }
          
          // For any unvisited nodes (disconnected), set a default level
          Object.keys(graph).forEach(nodeId => {
            if (graph[nodeId].level === undefined) {
              graph[nodeId].level = 0;
            }
          });
          
          // Step 4: Assign columns to nodes within each level
          // First, count nodes at each level
          const levelCounts: Record<number, number> = {};
          const nodesAtLevel: Record<number, string[]> = {};
          
          Object.keys(graph).forEach(nodeId => {
            const level = graph[nodeId].level || 0;
            if (!levelCounts[level]) {
              levelCounts[level] = 0;
              nodesAtLevel[level] = [];
            }
            nodesAtLevel[level].push(nodeId);
            levelCounts[level]++;
          });
          
          // Assign columns based on node position within level
          Object.keys(nodesAtLevel).forEach(level => {
            const nodesInLevel = nodesAtLevel[Number(level)];
            const nodeCount = nodesInLevel.length;
            
            nodesInLevel.forEach((nodeId, index) => {
              graph[nodeId].column = index;
            });
          });
          
          // Step 5: Calculate final positions
          const LEVEL_HEIGHT = 150; // Vertical spacing between levels
          const NODE_WIDTH = 200; // Horizontal spacing between nodes
          
          // Apply positions to nodes
          mappedNodes.forEach(node => {
            const graphNode = graph[node.id];
            const level = graphNode.level || 0;
            const column = graphNode.column || 0;
            const totalNodesAtLevel = levelCounts[level] || 1;
            
            // Center nodes horizontally at each level
            const levelWidth = totalNodesAtLevel * NODE_WIDTH;
            const startX = -(levelWidth / 2) + (NODE_WIDTH / 2);
            
            node.position = {
              x: startX + (column * NODE_WIDTH),
              y: level * LEVEL_HEIGHT
            };
          });
          
          nodes = mappedNodes;
          edges = mappedEdges;
        } else {
          // Fallback if Claude doesn't return proper structure
          console.error('Invalid workflow structure in Claude response');
          throw new Error('Invalid workflow structure in Claude response');
        }
      } catch (aiError) {
        console.error('Error generating workflow with Claude:', aiError);
        
        // Fallback to basic workflow structure if Claude API fails
        console.log('Falling back to basic workflow structure');
        
        // Generate nodes for start, end, and each requirement
        nodes = [
          {
            id: 'start',
            type: 'start',
            position: { x: 250, y: 50 },
            data: { label: 'Start' }
          }
        ];
        
        // Add nodes for each requirement
        workflowRequirements.forEach((req, index) => {
          nodes.push({
            id: `req-${req.id}`,
            type: 'task',
            position: { x: 250, y: 150 + (index * 100) },
            data: {
              label: req.title,
              description: req.description,
              requirementId: req.id
            }
          });
        });
        
        // Add end node
        nodes.push({
          id: 'end',
          type: 'end',
          position: { x: 250, y: 150 + (workflowRequirements.length * 100) },
          data: { label: 'End' }
        });
        
        // Generate edges connecting all nodes in sequence
        edges = [];
        
        // Connect start to first requirement
        if (workflowRequirements.length > 0) {
          edges.push({
            id: 'start-to-first',
            source: 'start',
            target: `req-${workflowRequirements[0].id}`,
            type: 'default'
          });
        } else {
          // If no requirements, connect start directly to end
          edges.push({
            id: 'start-to-end',
            source: 'start',
            target: 'end',
            type: 'default'
          });
        }
      
        // Connect requirements to each other in sequence
        for (let i = 0; i < workflowRequirements.length - 1; i++) {
          edges.push({
            id: `req-${workflowRequirements[i].id}-to-req-${workflowRequirements[i+1].id}`,
            source: `req-${workflowRequirements[i].id}`,
            target: `req-${workflowRequirements[i+1].id}`,
            type: 'default'
          });
        }
        
        // Connect last requirement to end
        if (workflowRequirements.length > 0) {
          edges.push({
            id: 'last-to-end',
            source: `req-${workflowRequirements[workflowRequirements.length-1].id}`,
            target: 'end',
            type: 'default'
          });
        }
      }
      
      // Create the workflow
      const newWorkflow = await storage.createWorkflow({
        name: workflowName,
        description: req.body.description || 'Automatically generated workflow from requirements',
        projectId,
        status: 'draft',
        version: 1,
        nodes,
        edges
      });
      
      // Log the creation as an activity
      await storage.createActivity({
        type: "generated_workflow",
        description: `Generated workflow "${newWorkflow.name}" from ${workflowRequirements.length} requirements`,
        userId: req.session.userId || 1, // Use demo user if not logged in
        projectId,
        relatedEntityId: newWorkflow.id
      });
      
      res.status(201).json(newWorkflow);
    } catch (error) {
      console.error("Error generating workflow:", error);
      res.status(500).json({ message: "Internal server error" });
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
                      
                      // Instead of using hardcoded fallback templates, always use the stream processor
                      console.log(`Context-based generation failed, will try stream processor instead for ${domain} ${docType}`);
                      
                      try {
                        // Import the stream processor
                        const { streamProcessPdfText } = await import('./stream-pdf-processor.js');
                        
                        // Use our dedicated stream processor with either contextPrompt or contextText
                        const projectName = project?.name || 'Unknown Project';
                        
                        // Create a more detailed extraction context
                        const enhancedContext = `
                          Project: ${projectName}
                          Document Type: ${docType}
                          Domain: ${domain}
                          Keywords: ${keywords.join(', ')}
                          Filename: ${req.file!.originalname}
                          
                          ${contextPrompt}
                        `;
                        
                        // Write the enhanced context to a temporary file
                        const enhancedContextPath = path.join(path.dirname(req.file!.path), 'enhanced_context_' + path.basename(req.file!.path, '.pdf') + '.txt');
                        fs.writeFileSync(enhancedContextPath, enhancedContext, 'utf8');
                        
                        // Process with stream processor using the enhanced context
                        requirements = await streamProcessPdfText(
                          enhancedContext,
                          enhancedContextPath,
                          projectName,
                          req.file!.originalname,
                          contentType,
                          minRequirements * 2, // Increase minimum requirements to get more thorough results
                          inputDataRecord.id // Pass input data ID for text references
                        );
                        
                        // Clean up temporary file
                        try {
                          fs.unlinkSync(enhancedContextPath);
                        } catch (err) {
                          console.error('Error removing enhanced context file:', err);
                        }
                        
                        console.log(`Stream processor with enhanced context returned ${requirements.length} requirements`);
                        
                        // If we still didn't get requirements, try Claude as a fallback
                        if (requirements.length === 0) {
                          console.log("Stream processor returned no requirements. Trying Claude as a final fallback");
                          
                          try {
                            // Import Claude processor
                            const { generateRequirementsWithClaude } = await import('./claude.js');
                            
                            // Try Claude with the enhanced context
                            requirements = await generateRequirementsWithClaude(
                              enhancedContext,
                              projectName,
                              req.file!.originalname,
                              contentType,
                              minRequirements
                            );
                            
                            console.log(`Claude returned ${requirements.length} requirements as final fallback`);
                          } catch (claudeError) {
                            console.error("Claude fallback also failed:", claudeError);
                            // At this point we have no fallback options left
                            // Return an empty array, the user will need to try again or manually add requirements
                            requirements = [];
                          }
                        }
                      } catch (streamError) {
                        console.error("Error in stream processing:", streamError);
                        // If all automated approaches fail, return an empty array
                        requirements = [];
                      }
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
            
            // Try to use Claude as the final fallback
            try {
              console.log("Attempting to use Claude as a fallback...");
              
              // Extract text content for Claude to process
              let textContent = '';
              
              if (type === 'text' || type === 'document') {
                textContent = fs.readFileSync(req.file!.path, 'utf8');
              } else if (type === 'pdf') {
                // Use our PDF processor to extract text
                textContent = await extractTextFromPdf(req.file!.path);
              } else {
                // For other file types, provide a description
                textContent = `This is a ${type} file named ${req.file!.originalname} that needs to be analyzed to extract requirements for the project ${project.name}.`;
              }
              
              // Import Claude processor
              const { generateRequirementsWithClaude } = await import('./claude.js');
              
              // Use Claude with the file content
              requirements = await generateRequirementsWithClaude(
                textContent,
                project.name,
                req.file!.originalname,
                contentType,
                5 // Fixed number of min requirements
              );
              
              // If Claude also fails or returns empty, throw an error to be handled
              if (!requirements || requirements.length === 0) {
                throw new Error("Claude AI failed to generate requirements");
              }
              
              console.log(`Claude successfully generated ${requirements.length} requirements as fallback`);
              
            } catch (claudeError) {
              // If both AI services fail, log the error and throw a user-friendly error
              console.error("Error using Claude as fallback:", claudeError);
              
              // Update input data status to failed
              await storage.updateInputData(inputDataRecord.id, { status: "failed" });
              
              // Return error to client
              return res.status(500).json({ 
                message: "Unable to process the uploaded file with available AI services. Please try again later or contact support.",
                error: "AI_PROCESSING_FAILED"
              });
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
      const [project] = await db.select()
        .from(projects)
        .where(eq(projects.id, projectId));
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Always use direct database access to ensure we get consistent data
      // with all fields including the latest acceptance criteria
      // This approach ensures we get JSON fields like acceptanceCriteria properly parsed
      const [dbRequirement] = await db.select()
        .from(requirements)
        .where(
          and(
            eq(requirements.id, requirementId),
            eq(requirements.projectId, projectId)
          )
        );
      
      if (!dbRequirement) {
        // Try to find it by ID only to provide a better error message
        const [anyRequirement] = await db.select()
          .from(requirements)
          .where(eq(requirements.id, requirementId));
        
        if (!anyRequirement) {
          return res.status(404).json({ message: "Requirement not found" });
        }
        
        // Found a requirement but in a different project
        return res.status(404).json({ 
          message: "Requirement does not belong to this project",
          reqProjectId: anyRequirement.projectId,
          requestedProjectId: projectId
        });
      }
      
      console.log("Found matching requirement from project requirements:", dbRequirement);
      res.json(dbRequirement);
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

      // Always use direct database queries for requirements to ensure consistency
      // This avoids memory/database discrepancies
      const requirementsData = await db.select()
        .from(requirements)
        .where(eq(requirements.projectId, projectId));
      
      // Filter requirements based on query params
      let filteredRequirements = requirementsData;
      
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

      // Use direct database queries for consistent data
      const projectRequirements = await db.select()
        .from(requirements)
        .where(eq(requirements.projectId, projectId));
      
      // Create the export data structure
      const exportData = {
        project: {
          name: project.name,
          description: project.description,
          type: project.type,
          exportDate: new Date().toISOString()
        },
        requirements: projectRequirements.map(r => ({
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

      // First, get all requirements for the project directly from the database
      // This ensures consistency with other database operations
      const projectRequirements = await db.select()
        .from(requirements)
        .where(eq(requirements.projectId, projectId));
      
      if (!projectRequirements || projectRequirements.length === 0) {
        return res.json([]);
      }
      
      // Get tasks for each requirement
      const tasksPromises = projectRequirements.map(req => 
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

      // Get requirement directly from the database for debugging
      const [directRequirement] = await db.select()
        .from(requirements)
        .where(eq(requirements.id, requirementId));
      
      console.log("Direct DB lookup result:", directRequirement);
      
      // If direct lookup works, use it
      const requirement = directRequirement;
      
      if (!requirement) {
        console.error(`Requirement with ID ${requirementId} not found in database via direct lookup`);
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
      const user = await storage.getUserByUsername("demo");
      
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

      // Update the requirement with the new acceptance criteria
      // Use direct database access for the update
      const [updatedRequirement] = await db
        .update(requirements)
        .set({ acceptanceCriteria })
        .where(eq(requirements.id, requirementId))
        .returning();

      console.log("Updated requirement with acceptance criteria:", updatedRequirement);
      
      // Invalidate any cached requirement data
      // This is a workaround for the storage layer's caching
      storage.invalidateRequirementCache?.(requirementId);

      // Add activity
      const activityData = {
        type: "generated_acceptance_criteria",
        description: `${user.username} generated acceptance criteria for requirement ${requirement.codeId || requirement.id}`,
        userId: user.id,
        projectId: requirement.projectId,
        relatedEntityId: requirement.id,
        createdAt: new Date()
      };
      await storage.createActivity(activityData);

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
      
      // Use direct DB lookup instead of going through the storage layer
      const directDbResult = await db
        .select()
        .from(requirements)
        .where(eq(requirements.id, requirementId))
        .limit(1);
      
      const requirement = directDbResult[0];
      
      // Log the direct DB lookup result
      console.log('Direct DB lookup result for implementation tasks:', requirement);
      
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

      // Use direct DB lookup for project
      const projectResult = await db
        .select()
        .from(projects)
        .where(eq(projects.id, effectiveProjectId))
        .limit(1);
      
      const project = projectResult[0];
      
      if (!project) {
        console.error(`Project with ID ${effectiveProjectId} not found for requirement ${requirementId}`);
        return res.status(404).json({ message: "Project not found", projectId: effectiveProjectId });
      }
      
      console.log('Found project for implementation tasks:', project.name);

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
          implementationSteps: task.implementationSteps || [],
          overallDocumentationLinks: task.overallDocumentationLinks || [],
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
      const activityData = {
        type: "generated_tasks",
        description: `${user.username} generated ${createdTasks.length} Salesforce-specific implementation tasks for requirement ${requirement.codeId}`,
        userId: user.id,
        projectId: requirement.projectId,
        relatedEntityId: requirement.id,
        createdAt: new Date()
      };
      await storage.createActivity(activityData);

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

  // Generate AI Expert Review using Google Gemini
  app.post("/api/requirements/:requirementId/generate-expert-review", async (req: Request, res: Response) => {
    try {
      const requirementId = parseInt(req.params.requirementId);
      if (isNaN(requirementId)) {
        return res.status(400).json({ message: "Invalid requirement ID", requirementId: req.params.requirementId });
      }

      // Get requirement from the database
      const [requirement] = await db.select()
        .from(requirements)
        .where(eq(requirements.id, requirementId));
      
      if (!requirement) {
        console.error(`Requirement with ID ${requirementId} not found in database`);
        return res.status(404).json({ message: "Requirement not found", requirementId });
      }

      // Combine title and description for a more comprehensive review
      const requirementText = `Title: ${requirement.title}\n\nDescription: ${requirement.description}`;
      
      console.log(`Generating expert review for requirement ${requirementId}`);
      
      // Generate the expert review using Google Gemini
      const expertReview = await generateExpertReview(requirementText);
      
      // Update the requirement with the expert review in the database
      await db.update(requirements)
        .set({ 
          expertReview: JSON.stringify(expertReview),
          updatedAt: new Date() 
        })
        .where(eq(requirements.id, requirementId));
      
      // Return the expert review to the client
      res.json(expertReview);
    } catch (error) {
      console.error("Error generating expert review:", error);
      res.status(500).json({ message: "Failed to generate expert review", error: String(error) });
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
  
  // Configure the upload directory serving (already created above)
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
  
  // Document template routes
  app.use('/api/document-templates', documentTemplateRoutes);
  
  // Documents routes
  app.use('/api/documents', documentRoutes);
  
  // Project roles routes
  app.use('/api', projectRolesRoutes);
  
  // Direct routes for requirement and task role efforts (needed for frontend compatibility)
  app.get('/api/requirements/:requirementId/role-efforts', isAuthenticated, async (req, res) => {
    try {
      const requirementId = parseInt(req.params.requirementId);
      if (isNaN(requirementId)) {
        return res.status(400).json({ message: 'Invalid requirement ID' });
      }
      
      // Get all role efforts for the requirement
      const efforts = await storage.getRequirementRoleEfforts(requirementId);
      res.json(efforts);
    } catch (error) {
      console.error('Error getting requirement role efforts:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  app.post('/api/requirements/:requirementId/role-efforts', isAuthenticated, async (req, res) => {
    try {
      const requirementId = parseInt(req.params.requirementId);
      if (isNaN(requirementId)) {
        return res.status(400).json({ message: 'Invalid requirement ID' });
      }
      
      // Get the requirement to determine the project ID
      const requirement = await storage.getRequirement(requirementId);
      if (!requirement) {
        return res.status(404).json({ message: 'Requirement not found' });
      }
      
      // Create the role effort using the original method with projectId
      const validatedData = { ...req.body, requirementId };
      const effort = await storage.createRequirementRoleEffort(validatedData);
      res.status(201).json(effort);
    } catch (error) {
      console.error('Error creating requirement role effort:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  app.delete('/api/requirements/:requirementId/role-efforts/:effortId', isAuthenticated, async (req, res) => {
    try {
      const requirementId = parseInt(req.params.requirementId);
      const effortId = parseInt(req.params.effortId);
      if (isNaN(requirementId) || isNaN(effortId)) {
        return res.status(400).json({ message: 'Invalid IDs' });
      }
      
      // Get the requirement to determine the project ID
      const requirement = await storage.getRequirement(requirementId);
      if (!requirement) {
        return res.status(404).json({ message: 'Requirement not found' });
      }
      
      // Delete the role effort
      await storage.deleteRequirementRoleEffort(effortId);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting requirement role effort:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  // Task role efforts direct routes
  app.get('/api/tasks/:taskId/role-efforts', isAuthenticated, async (req, res) => {
    try {
      const taskId = parseInt(req.params.taskId);
      if (isNaN(taskId)) {
        return res.status(400).json({ message: 'Invalid task ID' });
      }
      
      // Get all role efforts for the task
      const efforts = await storage.getTaskRoleEfforts(taskId);
      res.json(efforts);
    } catch (error) {
      console.error('Error getting task role efforts:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  app.post('/api/tasks/:taskId/role-efforts', isAuthenticated, async (req, res) => {
    try {
      const taskId = parseInt(req.params.taskId);
      if (isNaN(taskId)) {
        return res.status(400).json({ message: 'Invalid task ID' });
      }
      
      // Get the task to determine the project ID
      const task = await storage.getImplementationTask(taskId);
      if (!task) {
        return res.status(404).json({ message: 'Task not found' });
      }
      
      // Create the role effort
      const validatedData = { ...req.body, taskId };
      const effort = await storage.createTaskRoleEffort(validatedData);
      res.status(201).json(effort);
    } catch (error) {
      console.error('Error creating task role effort:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  app.delete('/api/tasks/:taskId/role-efforts/:effortId', isAuthenticated, async (req, res) => {
    try {
      const taskId = parseInt(req.params.taskId);
      const effortId = parseInt(req.params.effortId);
      if (isNaN(taskId) || isNaN(effortId)) {
        return res.status(400).json({ message: 'Invalid IDs' });
      }
      
      // Get the task to determine the project ID
      const task = await storage.getImplementationTask(taskId);
      if (!task) {
        return res.status(404).json({ message: 'Task not found' });
      }
      
      // Delete the role effort
      await storage.deleteTaskRoleEffort(effortId);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting task role effort:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  // Simple PDF generator routes will be registered separately

  // Requirement contradiction analysis endpoint
  app.post('/api/requirements/analyze-contradictions', async (req: Request, res: Response) => {
    try {
      // Import the contradiction service
      const { analyzeContradictions, isContradictionServiceAvailable } = await import('./contradiction-service');
      const requirementsInput = req.body;
      
      if (!requirementsInput.requirements || !Array.isArray(requirementsInput.requirements)) {
        return res.status(400).json({ message: "Invalid input: requirements must be an array of strings" });
      }
      
      // Get requirements from the request body
      const requirements = requirementsInput.requirements;
      console.log(`Analyzing contradictions for ${requirements.length} requirements directly via API`);
      
      // Check if HuggingFace API key is available
      if (!process.env.HUGGINGFACE_API_KEY) {
        console.error('HuggingFace API key not found in environment');
        return res.status(500).json({ 
          message: "HuggingFace API key not found. This feature requires a valid HuggingFace API key.",
          service_unavailable: true
        });
      }
      
      // Log custom endpoint being used
      console.log('Using HuggingFace custom inference endpoint:');
      console.log('- Endpoint: https://xfdfblfb13h03kfi.us-east-1.aws.endpoints.huggingface.cloud');
      
      // Analyze contradictions using custom HuggingFace endpoint
      const analysisResult = await analyzeContradictions(requirementsInput);
      
      // For synchronous requests, log detailed results
      if (!requirementsInput.async) {
        console.log(`Analysis complete: Found ${analysisResult.contradictions.length} potential contradictions`);
        console.log(`Made ${analysisResult.comparisons_made} comparisons and ${analysisResult.nli_checks_made} NLI checks`);
        
        if (analysisResult.errors) {
          console.warn(`Analysis encountered errors: ${analysisResult.errors}`);
        }
      } else {
        console.log(`Asynchronous analysis started: task_id=${analysisResult.task_id}`);
      }
      
      return res.status(200).json(analysisResult);
    } catch (error: any) {
      console.error("Error analyzing contradictions:", error);
      return res.status(500).json({ message: error.message || "Error analyzing contradictions" });
    }
  });
  
  // Get contradiction analysis task status
  app.get('/api/requirements/contradiction-tasks/:taskId', async (req: Request, res: Response) => {
    try {
      const taskId = parseInt(req.params.taskId);
      if (isNaN(taskId)) {
        return res.status(400).json({ message: "Invalid task ID" });
      }
      
      const { getAnalysisStatus } = await import('./contradiction-service');
      const status = await getAnalysisStatus(taskId);
      
      if (!status) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      return res.status(200).json(status);
    } catch (error: any) {
      console.error("Error getting contradiction analysis status:", error);
      return res.status(500).json({ message: error.message || "Error getting analysis status" });
    }
  });
  
  // Get project contradictions
  app.get('/api/projects/:projectId/contradictions', async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }
      
      const { getProjectContradictions } = await import('./contradiction-service');
      const contradictions = await getProjectContradictions(projectId);
      
      console.log(`Retrieved ${contradictions.contradictions.length} contradictions for project ${projectId}`);
      return res.status(200).json(contradictions);
    } catch (error: any) {
      console.error("Error getting project contradictions:", error);
      return res.status(500).json({ message: error.message || "Error getting project contradictions" });
    }
  });
  
  // Endpoint to check for duplicates and contradictions in a project's requirements
  app.get('/api/projects/:projectId/requirements/quality-check', async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }
      
      // Get project requirements
      const projectRequirements = await storage.getRequirementsByProject(projectId);
      if (!projectRequirements || projectRequirements.length === 0) {
        return res.status(200).json({ 
          contradictions: [],
          totalRequirements: 0,
          processing_time: 0
        });
      }
      
      console.log(`Analyzing quality check for ${projectRequirements.length} requirements in project ${projectId}`);
      
      // Import the contradiction service
      const { analyzeContradictions } = await import('./contradiction-service');
      
      // Extract requirement descriptions for analysis
      const requirementTexts = projectRequirements.map(req => req.description);
      
      // Log custom endpoint being used
      console.log('Using HuggingFace custom inference endpoint:');
      console.log('- Endpoint: https://xfdfblfb13h03kfi.us-east-1.aws.endpoints.huggingface.cloud');
      
      // Analyze contradictions - use async mode for larger projects
      const useAsync = projectRequirements.length > 20; // Use async for projects with many requirements
      const analysisResult = await analyzeContradictions({
        requirements: requirementTexts,
        projectId: projectId,
        async: useAsync
      });
      
      // Handle asynchronous or synchronous response appropriately
      if (useAsync && analysisResult.task_id) {
        console.log(`Started asynchronous analysis with task ID: ${analysisResult.task_id}`);
        
        // For async requests, return the task info so the client can poll for results
        return res.status(200).json({
          is_async: true,
          task_id: analysisResult.task_id,
          totalRequirements: projectRequirements.length,
          message: "Contradiction analysis started. Check task status to monitor progress."
        });
      } else {
        // For synchronous responses, process as before
        console.log(`Analysis complete: Found ${analysisResult.contradictions.length} potential contradictions`);
        console.log(`Made ${analysisResult.comparisons_made} comparisons and ${analysisResult.nli_checks_made} NLI checks`);
        
        if (analysisResult.errors) {
          console.warn(`Analysis encountered errors: ${analysisResult.errors}`);
        }
        
        // Map contradiction results to include requirement IDs
        const contradictionsWithIds = analysisResult.contradictions.map(contradiction => {
          return {
            requirement1: {
              id: projectRequirements[contradiction.requirement1.index].id,
              text: contradiction.requirement1.text
            },
            requirement2: {
              id: projectRequirements[contradiction.requirement2.index].id,
              text: contradiction.requirement2.text
            },
            similarity_score: contradiction.similarity_score,
            nli_contradiction_score: contradiction.nli_contradiction_score
          };
        });
        
        // Return the results, including any error messages
        return res.status(200).json({
          is_async: false,
          contradictions: contradictionsWithIds,
          totalRequirements: projectRequirements.length,
          processing_time: analysisResult.processing_time_seconds,
          errors: analysisResult.errors // Pass error info to client if there were any issues
        });
      }
    } catch (error: any) {
      console.error("Error checking requirement quality:", error);
      return res.status(500).json({ message: error.message || "Error checking requirement quality" });
    }
  });
  
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ message: "An unexpected error occurred", error: err.message });
  });
  
  return httpServer;
}