import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertProjectSchema, 
  insertInputDataSchema, 
  insertRequirementSchema,
  insertActivitySchema
} from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";
import os from "os";
import nlp from "compromise";

// Configure multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const tempDir = path.join(os.tmpdir(), 'reqgenius-uploads');
      
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

  // Current user endpoint (in a real app, this would use authentication)
  app.get("/api/me", async (req: Request, res: Response) => {
    // For demo, always return the demo user
    const user = await storage.getUserByUsername("demo");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Don't return the password
    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
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
      
      // Create input data record
      const inputDataRecord = await storage.createInputData({
        name: req.file.originalname,
        type,
        size: req.file.size,
        projectId,
        status: "processing",
        metadata: { path: req.file.path }
      });

      // In a real app, we would send this to a background job for processing
      // For demo, we'll immediately process text files for requirements
      setTimeout(async () => {
        if (type === 'text' || type === 'document') {
          try {
            const fileContent = fs.readFileSync(req.file!.path, 'utf8');
            
            // Simple NLP to extract potential requirements
            const doc = nlp(fileContent);
            const sentences = doc.sentences().out('array');
            
            const requirementKeywords = [
              'must', 'should', 'will', 'shall', 'required', 'needs to', 
              'have to', 'system', 'user', 'implement', 'support'
            ];
            
            const potentialRequirements = sentences.filter(sentence => 
              requirementKeywords.some(keyword => sentence.toLowerCase().includes(keyword))
            );
            
            // Generate requirements from extracted text
            for (let i = 0; i < Math.min(potentialRequirements.length, 5); i++) {
              const reqText = potentialRequirements[i];
              
              // Determine category based on content
              let category = 'functional';
              if (reqText.toLowerCase().includes('secur') || reqText.toLowerCase().includes('protect')) {
                category = 'security';
              } else if (reqText.toLowerCase().includes('perform') || reqText.toLowerCase().includes('fast') || reqText.toLowerCase().includes('second')) {
                category = 'performance';
              } else if (reqText.toLowerCase().includes('user interface') || reqText.toLowerCase().includes('usability')) {
                category = 'non-functional';
              }
              
              // Generate a code ID
              const requirementsCount = (await storage.getRequirementsByProject(projectId)).length;
              const codeId = `REQ-${(requirementsCount + i + 1).toString().padStart(3, '0')}`;
              
              await storage.createRequirement({
                text: reqText,
                category,
                priority: Math.random() > 0.7 ? 'high' : 'medium',
                projectId,
                inputDataId: inputDataRecord.id,
                codeId,
                source: inputDataRecord.name
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
        } else {
          // For non-text files, just mark as completed
          await storage.updateInputData(inputDataRecord.id, { status: "completed" });
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
  app.get("/api/projects/:projectId/requirements", async (req: Request, res: Response) => {
    const projectId = parseInt(req.params.projectId);
    if (isNaN(projectId)) {
      return res.status(400).json({ message: "Invalid project ID" });
    }

    const project = await storage.getProject(projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Filter parameters
    const category = req.query.category as string | undefined;
    const priority = req.query.priority as string | undefined;
    const source = req.query.source as string | undefined;
    const search = req.query.search as string | undefined;

    let requirements = await storage.getRequirementsByProject(projectId);
    
    // Apply filters
    if (category) {
      requirements = requirements.filter(req => req.category === category);
    }
    
    if (priority) {
      requirements = requirements.filter(req => req.priority === priority);
    }
    
    if (source) {
      requirements = requirements.filter(req => req.source === source);
    }
    
    if (search) {
      const searchLower = search.toLowerCase();
      requirements = requirements.filter(req => 
        req.text.toLowerCase().includes(searchLower) || 
        req.codeId.toLowerCase().includes(searchLower)
      );
    }

    res.json(requirements);
  });

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

      const validatedData = insertRequirementSchema.parse({
        ...req.body,
        projectId,
        codeId
      });

      const requirement = await storage.createRequirement(validatedData);
      
      // Add activity
      await storage.createActivity({
        type: "created_requirement",
        description: `${user.username} created requirement "${codeId}"`,
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
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      const requirementId = parseInt(req.params.id);
      if (isNaN(requirementId)) {
        return res.status(400).json({ message: "Invalid requirement ID" });
      }

      const requirement = await storage.getRequirement(requirementId);
      if (!requirement) {
        return res.status(404).json({ message: "Requirement not found" });
      }

      if (requirement.projectId !== projectId) {
        return res.status(403).json({ message: "Requirement does not belong to the specified project" });
      }

      // For demo, always use the demo user
      const user = await storage.getUserByUsername("demo");
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Update the requirement
      const updatedRequirement = await storage.updateRequirement(requirementId, req.body);
      
      // Add activity for requirement update
      await storage.createActivity({
        type: "updated_requirement",
        description: `${user.username} updated requirement "${requirement.codeId}"`,
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
    const projectId = parseInt(req.params.projectId);
    if (isNaN(projectId)) {
      return res.status(400).json({ message: "Invalid project ID" });
    }

    const requirementId = parseInt(req.params.id);
    if (isNaN(requirementId)) {
      return res.status(400).json({ message: "Invalid requirement ID" });
    }

    const requirement = await storage.getRequirement(requirementId);
    if (!requirement) {
      return res.status(404).json({ message: "Requirement not found" });
    }

    if (requirement.projectId !== projectId) {
      return res.status(403).json({ message: "Requirement does not belong to the specified project" });
    }

    // Delete the requirement
    await storage.deleteRequirement(requirementId);
    
    // For demo, always use the demo user
    const user = await storage.getUserByUsername("demo");
    
    if (user) {
      // Add activity for requirement deletion
      await storage.createActivity({
        type: "deleted_requirement",
        description: `${user.username} deleted requirement "${requirement.codeId}"`,
        userId: user.id,
        projectId,
        relatedEntityId: null
      });
    }

    res.status(204).end();
  });

  // Activities endpoints
  app.get("/api/projects/:projectId/activities", async (req: Request, res: Response) => {
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
    
    res.json(activities);
  });

  // Export requirements
  app.get("/api/projects/:projectId/export", async (req: Request, res: Response) => {
    const projectId = parseInt(req.params.projectId);
    if (isNaN(projectId)) {
      return res.status(400).json({ message: "Invalid project ID" });
    }

    const project = await storage.getProject(projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }
    
    const requirements = await storage.getRequirementsByProject(projectId);
    
    // Format for export
    const exportData = {
      project: {
        name: project.name,
        description: project.description,
        type: project.type,
        exportDate: new Date().toISOString()
      },
      requirements: requirements.map(req => ({
        id: req.codeId,
        text: req.text,
        category: req.category,
        priority: req.priority,
        source: req.source
      }))
    };
    
    res.json(exportData);
  });

  return httpServer;
}
