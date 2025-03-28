import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertProjectSchema, 
  insertInputDataSchema, 
  insertRequirementSchema,
  insertActivitySchema,
  insertImplementationTaskSchema
} from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";
import os from "os";
import nlp from "compromise";
import { processTextFile, generateRequirementsForFile } from "./gemini";

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

      // This would be a background job in a real app
      // Generate requirements from the uploaded file
      setTimeout(async () => {
        try {
          console.log(`Processing file: ${req.file!.originalname} (${type}) with Gemini AI`);
          
          let requirements = [];
          
          try {
            // Process different file types with Gemini
            if (type === 'text' || type === 'document' || type === 'pdf') {
              // For text files, process content directly
              requirements = await processTextFile(
                req.file!.path, 
                project.name, 
                req.file!.originalname
              );
            } else {
              // For non-text files, generate requirements based on file type
              requirements = await generateRequirementsForFile(
                type, 
                req.file!.originalname, 
                project.name
              );
            }
          } catch (geminiError) {
            console.error("Error with Gemini processing:", geminiError);
            
            // Fallback to basic NLP if Gemini fails
            console.log("Falling back to basic NLP processing");
            
            // Initialize content for requirement extraction
            let content = "";
            
            // Extract content based on file type
            if (type === 'text' || type === 'document' || type === 'pdf') {
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
            } else if (type === 'audio' || type === 'video') {
              // Placeholder for audio/video
              content = `Transcription from ${type} file: ${req.file!.originalname}.
              The system must support ${type} processing for requirements.
              Users should be able to navigate through requirements efficiently.
              The application shall display metadata about the source ${type} file.
              Implementation of a search function is required to find specific requirements.
              Security measures must be in place to protect sensitive ${type} content.`;
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
            
            // If no requirements found, create some general ones based on file type
            if (requirements.length === 0) {
              requirements = [
                { text: `The system must properly process ${type} files like ${req.file!.originalname}`, category: 'functional', priority: 'high' },
                { text: `Users should be able to view detailed information about requirements extracted from ${type} files`, category: 'functional', priority: 'medium' },
                { text: `The application shall provide filtering and sorting options for requirements`, category: 'functional', priority: 'medium' },
                { text: `Implementation of version control is required for tracking requirement changes`, category: 'non-functional', priority: 'low' },
                { text: `Security measures must be in place to protect sensitive data in uploaded files`, category: 'security', priority: 'high' }
              ];
            }
          }
          
          // Process and store requirements
          for (let i = 0; i < Math.min(requirements.length, 5); i++) {
            const requirement = requirements[i];
            
            // Generate a code ID
            const requirementsCount = (await storage.getRequirementsByProject(projectId)).length;
            const codeId = `REQ-${(requirementsCount + i + 1).toString().padStart(3, '0')}`;
            
            await storage.createRequirement({
              text: requirement.text,
              category: requirement.category || 'functional',
              priority: requirement.priority || 'medium',
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
      
      // Check if requirement belongs to the specified project
      if (requirement.projectId !== projectId) {
        return res.status(404).json({ message: "Requirement not found in this project" });
      }
      
      res.json(requirement);
    } catch (error) {
      console.error("Error fetching requirement:", error);
      res.status(500).json({ message: "Error fetching requirement" });
    }
  });

  // Get all requirements with filtering
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

  // Implementation Task endpoints
  app.get("/api/requirements/:requirementId/tasks", async (req: Request, res: Response) => {
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

      const validatedData = insertImplementationTaskSchema.parse({
        ...req.body,
        requirementId
      });

      const task = await storage.createImplementationTask(validatedData);

      // For demo, always use the demo user
      const user = await storage.getUserByUsername("demo");
      if (user) {
        // Add activity for task creation
        await storage.createActivity({
          type: "created_task",
          description: `${user.username} created implementation task "${task.title}"`,
          userId: user.id,
          projectId: requirement.projectId,
          relatedEntityId: requirement.id
        });
      }

      res.status(201).json(task);
    } catch (error) {
      console.error("Error creating implementation task:", error);
      res.status(400).json({ message: "Invalid task data", error });
    }
  });

  app.get("/api/tasks/:id", async (req: Request, res: Response) => {
    const taskId = parseInt(req.params.id);
    if (isNaN(taskId)) {
      return res.status(400).json({ message: "Invalid task ID" });
    }

    const task = await storage.getImplementationTask(taskId);
    if (!task) {
      return res.status(404).json({ message: "Implementation task not found" });
    }

    res.json(task);
  });

  app.put("/api/tasks/:id", async (req: Request, res: Response) => {
    try {
      const taskId = parseInt(req.params.id);
      if (isNaN(taskId)) {
        return res.status(400).json({ message: "Invalid task ID" });
      }

      const task = await storage.getImplementationTask(taskId);
      if (!task) {
        return res.status(404).json({ message: "Implementation task not found" });
      }

      // We don't need to validate the entire schema since it's a partial update
      const updatedTask = await storage.updateImplementationTask(taskId, req.body);

      // For demo, always use the demo user
      const user = await storage.getUserByUsername("demo");
      if (user) {
        // Get the requirement to get the project ID
        const requirement = await storage.getRequirement(task.requirementId);
        if (requirement) {
          // Add activity for task update
          await storage.createActivity({
            type: "updated_task",
            description: `${user.username} updated implementation task "${updatedTask!.title}"`,
            userId: user.id,
            projectId: requirement.projectId,
            relatedEntityId: task.requirementId
          });
        }
      }

      res.json(updatedTask);
    } catch (error) {
      console.error("Error updating implementation task:", error);
      res.status(400).json({ message: "Invalid task data", error });
    }
  });

  app.delete("/api/tasks/:id", async (req: Request, res: Response) => {
    const taskId = parseInt(req.params.id);
    if (isNaN(taskId)) {
      return res.status(400).json({ message: "Invalid task ID" });
    }

    const task = await storage.getImplementationTask(taskId);
    if (!task) {
      return res.status(404).json({ message: "Implementation task not found" });
    }

    // Delete the task
    await storage.deleteImplementationTask(taskId);
    
    res.status(204).end();
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

      // This would use AI to generate implementation tasks in a real app
      // For now, we'll create some sample tasks based on the requirement
      const sourceTasks = [
        {
          title: `Extract data from ${project.sourceSystem}`,
          description: `Connect to ${project.sourceSystem} and extract relevant data needed for: ${requirement.text}`,
          status: "pending",
          priority: requirement.priority,
          system: "source",
          requirementId: requirement.id,
          estimatedHours: 4,
          complexity: "medium",
          assignee: null
        },
        {
          title: `Analyze ${project.sourceSystem} implementation`,
          description: `Study the current implementation in ${project.sourceSystem} related to: ${requirement.text}`,
          status: "pending",
          priority: requirement.priority,
          system: "source",
          requirementId: requirement.id,
          estimatedHours: 3, 
          complexity: "medium",
          assignee: null
        }
      ];

      const targetTasks = [
        {
          title: `Design ${project.targetSystem} component`,
          description: `Create design for the ${project.targetSystem} component that will implement: ${requirement.text}`,
          status: "pending",
          priority: requirement.priority,
          system: "target",
          requirementId: requirement.id,
          estimatedHours: 5,
          complexity: "medium",
          assignee: null
        },
        {
          title: `Implement in ${project.targetSystem}`,
          description: `Develop the implementation in ${project.targetSystem} for: ${requirement.text}`,
          status: "pending",
          priority: requirement.priority,
          system: "target",
          requirementId: requirement.id,
          estimatedHours: 8,
          complexity: requirement.priority === "high" ? "high" : "medium",
          assignee: null
        },
        {
          title: `Test ${project.targetSystem} implementation`,
          description: `Create and execute tests for the implementation of: ${requirement.text}`,
          status: "pending",
          priority: requirement.priority,
          system: "target",
          requirementId: requirement.id,
          estimatedHours: 4,
          complexity: "medium",
          assignee: null
        }
      ];

      // Create all tasks in sequence
      const allTasks = [];
      
      for (const taskData of [...sourceTasks, ...targetTasks]) {
        const task = await storage.createImplementationTask(taskData);
        allTasks.push(task);
      }

      // Create activity for task generation
      await storage.createActivity({
        type: "generated_tasks",
        description: `${user.username} automatically generated implementation tasks for requirement "${requirement.codeId}"`,
        userId: user.id,
        projectId: requirement.projectId,
        relatedEntityId: requirement.id
      });

      res.status(201).json({ 
        message: `Successfully generated ${allTasks.length} implementation tasks`,
        tasks: allTasks
      });
    } catch (error) {
      console.error("Error generating implementation tasks:", error);
      res.status(400).json({ message: "Error generating tasks", error });
    }
  });

  return httpServer;
}
