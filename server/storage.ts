import { 
  users, type User, type InsertUser,
  invites, type Invite, type InsertInvite,
  projects, type Project, type InsertProject,
  inputData, type InputData, type InsertInputData,
  requirements, type Requirement, type InsertRequirement,
  activities, type Activity, type InsertActivity,
  implementationTasks, type ImplementationTask, type InsertImplementationTask
} from "@shared/schema";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined>;
  authenticateUser(usernameOrEmail: string, password: string): Promise<User | undefined>;

  // Invite methods
  getInvite(token: string): Promise<Invite | undefined>;
  getInvitesByCreator(userId: number): Promise<Invite[]>;
  createInvite(invite: InsertInvite): Promise<Invite>;
  markInviteAsUsed(token: string): Promise<Invite | undefined>;

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
  getAllActivities(limit?: number): Promise<Activity[]>;
  createActivity(activity: InsertActivity): Promise<Activity>;
  
  // Implementation Task methods
  getImplementationTask(id: number): Promise<ImplementationTask | undefined>;
  getImplementationTasksByRequirement(requirementId: number): Promise<ImplementationTask[]>;
  createImplementationTask(task: InsertImplementationTask): Promise<ImplementationTask>;
  updateImplementationTask(id: number, task: Partial<InsertImplementationTask>): Promise<ImplementationTask | undefined>;
  deleteImplementationTask(id: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private invites: Map<string, Invite>;
  private projects: Map<number, Project>;
  private inputDataItems: Map<number, InputData>;
  private requirements: Map<number, Requirement>;
  private activities: Map<number, Activity>;
  private implementationTasks: Map<number, ImplementationTask>;
  private userIdCounter: number;
  private inviteIdCounter: number;
  private projectIdCounter: number;
  private inputDataIdCounter: number;
  private requirementIdCounter: number;
  private activityIdCounter: number;
  private implementationTaskIdCounter: number;

  constructor() {
    this.users = new Map();
    this.invites = new Map();
    this.projects = new Map();
    this.inputDataItems = new Map();
    this.requirements = new Map();
    this.activities = new Map();
    this.implementationTasks = new Map();
    this.userIdCounter = 1;
    this.inviteIdCounter = 1;
    this.projectIdCounter = 1;
    this.inputDataIdCounter = 1;
    this.requirementIdCounter = 1;
    this.activityIdCounter = 1;
    this.implementationTaskIdCounter = 1;

    // Add a demo user with profile information
    this.createUser({
      username: "demo",
      password: "password",
      firstName: "John",
      lastName: "Doe",
      email: "john.doe@example.com",
      company: "Demo Company Inc.",
      avatarUrl: null,
      role: "admin"
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
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }
  
  async authenticateUser(usernameOrEmail: string, password: string): Promise<User | undefined> {
    const user = Array.from(this.users.values()).find(
      (user) => (user.username === usernameOrEmail || user.email === usernameOrEmail) && user.password === password
    );
    
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const now = new Date();
    const user: User = { 
      ...insertUser, 
      id, 
      firstName: insertUser.firstName || null,
      lastName: insertUser.lastName || null,
      email: insertUser.email || null,
      company: insertUser.company || null,
      avatarUrl: insertUser.avatarUrl || null,
      role: insertUser.role || "user",
      invitedBy: insertUser.invitedBy || null,
      createdAt: now,
      updatedAt: now
    };
    this.users.set(id, user);
    return user;
  }
  
  // Invite methods
  async getInvite(token: string): Promise<Invite | undefined> {
    return this.invites.get(token);
  }
  
  async getInvitesByCreator(userId: number): Promise<Invite[]> {
    return Array.from(this.invites.values()).filter(
      invite => invite.createdById === userId
    );
  }
  
  async createInvite(invite: InsertInvite): Promise<Invite> {
    const id = this.inviteIdCounter++;
    const now = new Date();
    
    const newInvite: Invite = {
      ...invite,
      id,
      email: invite.email || null,
      createdById: invite.createdById || null,
      used: false,
      createdAt: now
    };
    
    this.invites.set(invite.token, newInvite);
    return newInvite;
  }
  
  async markInviteAsUsed(token: string): Promise<Invite | undefined> {
    const invite = this.invites.get(token);
    if (!invite) return undefined;
    
    const updatedInvite: Invite = {
      ...invite,
      used: true
    };
    
    this.invites.set(token, updatedInvite);
    return updatedInvite;
  }
  
  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    const existingUser = this.users.get(id);
    if (!existingUser) return undefined;
    
    const updatedUser: User = {
      ...existingUser,
      ...userData,
      updatedAt: new Date()
    };
    this.users.set(id, updatedUser);
    return updatedUser;
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
      description: project.description || null,
      sourceSystem: project.sourceSystem || null,
      targetSystem: project.targetSystem || null,
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
      status: data.status || "processing",
      contentType: data.contentType || null,
      metadata: data.metadata || null,
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
      priority: requirement.priority || "medium",
      inputDataId: requirement.inputDataId || null,
      source: requirement.source || null,
      acceptanceCriteria: requirement.acceptanceCriteria || [],
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
  
  async getAllActivities(limit: number = 10): Promise<Activity[]> {
    return Array.from(this.activities.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  async createActivity(activity: InsertActivity): Promise<Activity> {
    const id = this.activityIdCounter++;
    const now = new Date();
    const newActivity: Activity = { 
      ...activity, 
      id, 
      relatedEntityId: activity.relatedEntityId || null,
      createdAt: now 
    };
    this.activities.set(id, newActivity);
    return newActivity;
  }

  // Implementation Task methods
  async getImplementationTask(id: number): Promise<ImplementationTask | undefined> {
    return this.implementationTasks.get(id);
  }

  async getImplementationTasksByRequirement(requirementId: number): Promise<ImplementationTask[]> {
    return Array.from(this.implementationTasks.values()).filter(
      task => task.requirementId === requirementId
    );
  }

  async createImplementationTask(task: InsertImplementationTask): Promise<ImplementationTask> {
    const id = this.implementationTaskIdCounter++;
    const now = new Date();
    const newTask: ImplementationTask = { 
      ...task, 
      id, 
      status: task.status || "pending",
      priority: task.priority || "medium",
      estimatedHours: task.estimatedHours || null,
      complexity: task.complexity || null,
      assignee: task.assignee || null,
      createdAt: now, 
      updatedAt: now 
    };
    this.implementationTasks.set(id, newTask);
    return newTask;
  }

  async updateImplementationTask(id: number, task: Partial<InsertImplementationTask>): Promise<ImplementationTask | undefined> {
    const existingTask = this.implementationTasks.get(id);
    if (!existingTask) return undefined;
    
    const updatedTask: ImplementationTask = { 
      ...existingTask, 
      ...task, 
      updatedAt: new Date() 
    };
    this.implementationTasks.set(id, updatedTask);
    return updatedTask;
  }

  async deleteImplementationTask(id: number): Promise<boolean> {
    return this.implementationTasks.delete(id);
  }
}

export const storage = new MemStorage();
