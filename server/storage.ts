import { 
  users, type User, type InsertUser,
  projects, type Project, type InsertProject,
  inputData, type InputData, type InsertInputData,
  requirements, type Requirement, type InsertRequirement,
  activities, type Activity, type InsertActivity
} from "@shared/schema";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Project methods
  getProject(id: number): Promise<Project | undefined>;
  getProjects(userId: number): Promise<Project[]>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: number, project: Partial<InsertProject>): Promise<Project | undefined>;
  deleteProject(id: number): Promise<boolean>;

  // Input data methods
  getInputData(id: number): Promise<InputData | undefined>;
  getInputDataByProject(projectId: number): Promise<InputData[]>;
  createInputData(data: InsertInputData): Promise<InputData>;
  updateInputData(id: number, data: Partial<InsertInputData>): Promise<InputData | undefined>;
  deleteInputData(id: number): Promise<boolean>;

  // Requirement methods
  getRequirement(id: number): Promise<Requirement | undefined>;
  getRequirementsByProject(projectId: number): Promise<Requirement[]>;
  getRequirementsByInputData(inputDataId: number): Promise<Requirement[]>;
  createRequirement(requirement: InsertRequirement): Promise<Requirement>;
  updateRequirement(id: number, requirement: Partial<InsertRequirement>): Promise<Requirement | undefined>;
  deleteRequirement(id: number): Promise<boolean>;
  getHighPriorityRequirements(projectId: number, limit?: number): Promise<Requirement[]>;

  // Activity methods
  getActivitiesByProject(projectId: number, limit?: number): Promise<Activity[]>;
  createActivity(activity: InsertActivity): Promise<Activity>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private projects: Map<number, Project>;
  private inputDataItems: Map<number, InputData>;
  private requirements: Map<number, Requirement>;
  private activities: Map<number, Activity>;
  private userIdCounter: number;
  private projectIdCounter: number;
  private inputDataIdCounter: number;
  private requirementIdCounter: number;
  private activityIdCounter: number;

  constructor() {
    this.users = new Map();
    this.projects = new Map();
    this.inputDataItems = new Map();
    this.requirements = new Map();
    this.activities = new Map();
    this.userIdCounter = 1;
    this.projectIdCounter = 1;
    this.inputDataIdCounter = 1;
    this.requirementIdCounter = 1;
    this.activityIdCounter = 1;

    // Add a demo user
    this.createUser({
      username: "demo",
      password: "password"
    });

    // Create sample projects for demo user
    const projectIds = [
      this.createProject({
        name: "E-Commerce Platform Redesign",
        description: "Complete redesign of the customer-facing e-commerce platform with modern UI/UX principles.",
        type: "Website Redesign",
        userId: 1
      }).id,
      this.createProject({
        name: "Mobile App Development",
        description: "Development of a new mobile application for iOS and Android.",
        type: "Mobile Application",
        userId: 1
      }).id,
      this.createProject({
        name: "Marketing Website Overhaul",
        description: "Redesign and development of marketing website.",
        type: "Website Redesign",
        userId: 1
      }).id,
      this.createProject({
        name: "Internal Tool Development",
        description: "Development of internal tools for business operations.",
        type: "Internal Tool",
        userId: 1
      }).id
    ];

    // Create sample input data and requirements for first project
    const mainProjectId = projectIds[0];
    
    // Create sample input data
    const interviewInputId = this.createInputData({
      name: "Client Interview - John Smith.mp3",
      type: "audio",
      size: 18200000, // 18.2 MB
      projectId: mainProjectId,
      status: "completed",
      metadata: { duration: "32:15" }
    }).id;

    const feedbackInputId = this.createInputData({
      name: "User Feedback Collection.docx",
      type: "document",
      size: 1500000, // 1.5 MB
      projectId: mainProjectId,
      status: "completed",
      metadata: { pages: 8 }
    }).id;

    const meetingInputId = this.createInputData({
      name: "Stakeholder Meeting 05-15.mp4",
      type: "video",
      size: 42700000, // 42.7 MB
      projectId: mainProjectId,
      status: "completed",
      metadata: { duration: "51:24" }
    }).id;

    const securityInputId = this.createInputData({
      name: "Security Requirements Document.pdf",
      type: "pdf",
      size: 2800000, // 2.8 MB
      projectId: mainProjectId,
      status: "processing",
      metadata: { pages: 15 }
    }).id;

    // Create sample requirements
    this.createRequirement({
      text: "The system must support real-time inventory updates across all sales channels",
      category: "functional",
      priority: "high",
      projectId: mainProjectId,
      inputDataId: interviewInputId,
      codeId: "REQ-001",
      source: "Client Interview"
    });

    this.createRequirement({
      text: "Users must be able to checkout as guests without creating an account",
      category: "functional",
      priority: "high",
      projectId: mainProjectId,
      inputDataId: feedbackInputId,
      codeId: "REQ-015",
      source: "User Feedback"
    });

    this.createRequirement({
      text: "The platform must be responsive and work on mobile devices",
      category: "non-functional",
      priority: "high",
      projectId: mainProjectId,
      inputDataId: meetingInputId,
      codeId: "REQ-008",
      source: "Stakeholder Meeting"
    });

    this.createRequirement({
      text: "Secure payment processing with support for multiple providers",
      category: "security",
      priority: "high",
      projectId: mainProjectId,
      inputDataId: securityInputId,
      codeId: "REQ-022",
      source: "Security Assessment"
    });

    this.createRequirement({
      text: "Product pages must display related products and accessories",
      category: "functional",
      priority: "medium",
      projectId: mainProjectId,
      inputDataId: interviewInputId,
      codeId: "REQ-036",
      source: "Client Interview"
    });

    this.createRequirement({
      text: "The site must load within 2 seconds for 90% of users",
      category: "performance",
      priority: "medium",
      projectId: mainProjectId,
      inputDataId: meetingInputId,
      codeId: "REQ-042",
      source: "Stakeholder Meeting"
    });

    // Create sample activities
    this.createActivity({
      type: "added_requirements",
      description: "Sarah Johnson added 5 new requirements from interview transcript",
      userId: 1,
      projectId: mainProjectId,
      relatedEntityId: interviewInputId
    });

    this.createActivity({
      type: "uploaded_data",
      description: "Michael Chen uploaded client meeting recording",
      userId: 1,
      projectId: mainProjectId,
      relatedEntityId: meetingInputId
    });

    this.createActivity({
      type: "prioritized_requirements",
      description: "Alex Rodriguez prioritized 8 requirements",
      userId: 1,
      projectId: mainProjectId
    });

    this.createActivity({
      type: "generated_requirements",
      description: "Emma Wilson generated requirements from user feedback document",
      userId: 1,
      projectId: mainProjectId,
      relatedEntityId: feedbackInputId
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Project methods
  async getProject(id: number): Promise<Project | undefined> {
    return this.projects.get(id);
  }

  async getProjects(userId: number): Promise<Project[]> {
    return Array.from(this.projects.values()).filter(
      project => project.userId === userId
    );
  }

  async createProject(project: InsertProject): Promise<Project> {
    const id = this.projectIdCounter++;
    const now = new Date();
    const newProject: Project = { 
      ...project, 
      id, 
      createdAt: now, 
      updatedAt: now 
    };
    this.projects.set(id, newProject);
    return newProject;
  }

  async updateProject(id: number, project: Partial<InsertProject>): Promise<Project | undefined> {
    const existingProject = this.projects.get(id);
    if (!existingProject) return undefined;
    
    const updatedProject: Project = { 
      ...existingProject, 
      ...project, 
      updatedAt: new Date() 
    };
    this.projects.set(id, updatedProject);
    return updatedProject;
  }

  async deleteProject(id: number): Promise<boolean> {
    return this.projects.delete(id);
  }

  // Input data methods
  async getInputData(id: number): Promise<InputData | undefined> {
    return this.inputDataItems.get(id);
  }

  async getInputDataByProject(projectId: number): Promise<InputData[]> {
    return Array.from(this.inputDataItems.values()).filter(
      data => data.projectId === projectId
    );
  }

  async createInputData(data: InsertInputData): Promise<InputData> {
    const id = this.inputDataIdCounter++;
    const now = new Date();
    const newInputData: InputData = { 
      ...data, 
      id, 
      processed: data.status === "completed",
      createdAt: now 
    };
    this.inputDataItems.set(id, newInputData);
    return newInputData;
  }

  async updateInputData(id: number, data: Partial<InsertInputData>): Promise<InputData | undefined> {
    const existingData = this.inputDataItems.get(id);
    if (!existingData) return undefined;
    
    const updatedData: InputData = { 
      ...existingData, 
      ...data,
      processed: data.status === "completed" ? true : existingData.processed
    };
    this.inputDataItems.set(id, updatedData);
    return updatedData;
  }

  async deleteInputData(id: number): Promise<boolean> {
    return this.inputDataItems.delete(id);
  }

  // Requirement methods
  async getRequirement(id: number): Promise<Requirement | undefined> {
    return this.requirements.get(id);
  }

  async getRequirementsByProject(projectId: number): Promise<Requirement[]> {
    return Array.from(this.requirements.values()).filter(
      req => req.projectId === projectId
    );
  }

  async getRequirementsByInputData(inputDataId: number): Promise<Requirement[]> {
    return Array.from(this.requirements.values()).filter(
      req => req.inputDataId === inputDataId
    );
  }

  async createRequirement(requirement: InsertRequirement): Promise<Requirement> {
    const id = this.requirementIdCounter++;
    const now = new Date();
    const newRequirement: Requirement = { 
      ...requirement, 
      id, 
      createdAt: now, 
      updatedAt: now 
    };
    this.requirements.set(id, newRequirement);
    return newRequirement;
  }

  async updateRequirement(id: number, requirement: Partial<InsertRequirement>): Promise<Requirement | undefined> {
    const existingRequirement = this.requirements.get(id);
    if (!existingRequirement) return undefined;
    
    const updatedRequirement: Requirement = { 
      ...existingRequirement, 
      ...requirement, 
      updatedAt: new Date() 
    };
    this.requirements.set(id, updatedRequirement);
    return updatedRequirement;
  }

  async deleteRequirement(id: number): Promise<boolean> {
    return this.requirements.delete(id);
  }

  async getHighPriorityRequirements(projectId: number, limit: number = 10): Promise<Requirement[]> {
    return Array.from(this.requirements.values())
      .filter(req => req.projectId === projectId && req.priority === "high")
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  // Activity methods
  async getActivitiesByProject(projectId: number, limit: number = 10): Promise<Activity[]> {
    return Array.from(this.activities.values())
      .filter(activity => activity.projectId === projectId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  async createActivity(activity: InsertActivity): Promise<Activity> {
    const id = this.activityIdCounter++;
    const now = new Date();
    const newActivity: Activity = { 
      ...activity, 
      id, 
      createdAt: now 
    };
    this.activities.set(id, newActivity);
    return newActivity;
  }
}

export const storage = new MemStorage();
