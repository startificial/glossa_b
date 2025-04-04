import { 
  users, type User, type InsertUser,
  invites, type Invite, type InsertInvite,
  projects, type Project, type InsertProject,
  customers, type Customer, type InsertCustomer,
  inputData, type InputData, type InsertInputData,
  requirements, type Requirement, type InsertRequirement,
  activities, type Activity, type InsertActivity,
  implementationTasks, type ImplementationTask, type InsertImplementationTask
} from "@shared/schema";
import { and, desc, eq, or, like, sql as drizzleSql } from 'drizzle-orm';
import { db, sql } from './db';
import session from "express-session";
import connectPg from "connect-pg-simple";
import createMemoryStore from "memorystore";

// Create memory and Postgres session stores
const MemoryStore = createMemoryStore(session);
const PostgresSessionStore = connectPg(session);

// Storage interface with session store
export interface IStorage {
  // Session store for Express
  sessionStore: session.Store;
  
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

  // Customer methods
  getCustomer(id: number): Promise<Customer | undefined>;
  getAllCustomers(): Promise<Customer[]>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: number, customer: Partial<InsertCustomer>): Promise<Customer | undefined>;
  deleteCustomer(id: number): Promise<boolean>;

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
  getRequirementWithProjectCheck(id: number, projectId: number): Promise<Requirement | undefined>;
  getRequirementsByProject(projectId: number): Promise<Requirement[]>;
  getRequirementsByInputData(inputDataId: number): Promise<Requirement[]>;
  createRequirement(requirement: InsertRequirement): Promise<Requirement>;
  updateRequirement(id: number, requirement: Partial<InsertRequirement>): Promise<Requirement | undefined>;
  deleteRequirement(id: number): Promise<boolean>;
  getHighPriorityRequirements(projectId: number, limit?: number): Promise<Requirement[]>;
  invalidateRequirementCache?(id: number): void; // Optional method to invalidate any cached requirement data

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
  
  // Search methods
  quickSearch(userId: number, query: string, limit?: number): Promise<{
    projects: Project[];
    requirements: Requirement[];
  }>;
  
  advancedSearch(userId: number, query: string, filters?: {
    entityTypes?: string[];
    projectId?: number;
    category?: string;
    priority?: string;
    dateRange?: { from?: Date; to?: Date };
  }, pagination?: {
    page: number;
    limit: number;
  }): Promise<{
    projects: Project[];
    requirements: Requirement[];
    inputData: InputData[];
    tasks: ImplementationTask[];
    totalResults: number;
    totalPages: number;
  }>;
}

// In-memory storage implementation
export class MemStorage implements IStorage {
  sessionStore: session.Store;
  private users: Map<number, User>;
  private invites: Map<string, Invite>;
  private customers: Map<number, Customer>;
  private projects: Map<number, Project>;
  private inputDataItems: Map<number, InputData>;
  private requirements: Map<number, Requirement>;
  private activities: Map<number, Activity>;
  private implementationTasks: Map<number, ImplementationTask>;
  private userIdCounter: number;
  private inviteIdCounter: number;
  private customerIdCounter: number;
  private projectIdCounter: number;
  private inputDataIdCounter: number;
  private requirementIdCounter: number;
  private activityIdCounter: number;
  private implementationTaskIdCounter: number;

  constructor() {
    // Initialize session store
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    });
    
    // Initialize storage maps
    this.users = new Map();
    this.invites = new Map();
    this.customers = new Map();
    this.projects = new Map();
    this.inputDataItems = new Map();
    this.requirements = new Map();
    this.activities = new Map();
    this.implementationTasks = new Map();
    
    // Initialize ID counters
    this.userIdCounter = 1;
    this.inviteIdCounter = 1;
    this.customerIdCounter = 1;
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

  // Customer methods
  async getCustomer(id: number): Promise<Customer | undefined> {
    return this.customers.get(id);
  }

  async getAllCustomers(): Promise<Customer[]> {
    return Array.from(this.customers.values());
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const id = this.customerIdCounter++;
    const now = new Date();
    const newCustomer: Customer = {
      ...customer,
      id,
      description: customer.description || null,
      industry: customer.industry || null,
      backgroundInfo: customer.backgroundInfo || null,
      website: customer.website || null,
      contactEmail: customer.contactEmail || null,
      contactPhone: customer.contactPhone || null,
      createdAt: now,
      updatedAt: now
    };
    this.customers.set(id, newCustomer);
    return newCustomer;
  }

  async updateCustomer(id: number, customer: Partial<InsertCustomer>): Promise<Customer | undefined> {
    const existingCustomer = this.customers.get(id);
    if (!existingCustomer) return undefined;
    
    const updatedCustomer: Customer = {
      ...existingCustomer,
      ...customer,
      updatedAt: new Date()
    };
    this.customers.set(id, updatedCustomer);
    return updatedCustomer;
  }

  async deleteCustomer(id: number): Promise<boolean> {
    return this.customers.delete(id);
  }

  // Project methods
  async getProject(id: number): Promise<Project | undefined> {
    const project = this.projects.get(id);
    if (!project) return undefined;
    
    // If project has a customer ID, fetch the customer details
    if (project.customerId) {
      const customer = this.customers.get(project.customerId);
      if (customer) {
        const projectWithCustomer = {
          ...project,
          customerDetails: customer
        } as Project; // Type assertion needed for TypeScript
        return projectWithCustomer;
      }
    }
    
    return project;
  }

  async getProjects(userId: number): Promise<Project[]> {
    const userProjects = Array.from(this.projects.values()).filter(
      project => project.userId === userId
    );
    
    // Enrich projects with customer details
    return userProjects.map(project => {
      if (project.customerId) {
        const customer = this.customers.get(project.customerId);
        if (customer) {
          return {
            ...project,
            customerDetails: customer
          } as Project; // Type assertion needed for TypeScript
        }
      }
      return project;
    });
  }

  async createProject(project: InsertProject): Promise<Project> {
    const id = this.projectIdCounter++;
    const now = new Date();
    const newProject: Project = { 
      ...project, 
      id, 
      description: project.description || null,
      customerId: project.customerId || null,
      customer: project.customer || null,
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
  
  async getRequirementWithProjectCheck(id: number, projectId: number): Promise<Requirement | undefined> {
    // Get the requirement
    const requirement = this.requirements.get(id);
    
    // If found, check if it belongs to the specified project
    if (requirement && requirement.projectId === projectId) {
      return requirement;
    }
    
    // If no match with the project check, return the requirement only if we found it by ID
    return requirement;
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
      codeId: requirement.codeId || null,
      acceptanceCriteria: requirement.acceptanceCriteria || [],
      videoScenes: requirement.videoScenes || [],
      textReferences: requirement.textReferences || [],
      audioTimestamps: requirement.audioTimestamps || [],
      createdAt: now, 
      updatedAt: now 
    };
    this.requirements.set(id, newRequirement);
    return newRequirement;
  }

  async updateRequirement(id: number, requirement: Partial<InsertRequirement>): Promise<Requirement | undefined> {
    const existingRequirement = this.requirements.get(id);
    if (!existingRequirement) return undefined;
    
    // Initialize optional references if they don't exist in the update
    if (requirement.textReferences === undefined && !existingRequirement.textReferences) {
      requirement.textReferences = [];
    }
    
    if (requirement.audioTimestamps === undefined && !existingRequirement.audioTimestamps) {
      requirement.audioTimestamps = [];
    }
    
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
  
  // Method to invalidate cached requirement data
  invalidateRequirementCache(id: number): void {
    // For MemStorage, just make sure we have the latest data
    console.log(`Invalidating cache for requirement ID: ${id}`);
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
      taskType: task.taskType || null,
      sfDocumentationLinks: task.sfDocumentationLinks || [],
      implementationSteps: task.implementationSteps || [],
      overallDocumentationLinks: task.overallDocumentationLinks || [],
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

  // Search methods
  async quickSearch(userId: number, query: string, limit: number = 5): Promise<{
    projects: Project[];
    requirements: Requirement[];
  }> {
    // Skip search if query is empty
    if (!query || query.trim().length === 0) {
      return { projects: [], requirements: [] };
    }

    const searchTerm = query.toLowerCase().trim();
    const exactMatch = (text: string) => text.toLowerCase() === searchTerm;
    const fuzzyMatch = (text: string) => text.toLowerCase().includes(searchTerm);

    // Get user's projects
    const userProjects = Array.from(this.projects.values()).filter(
      project => project.userId === userId
    );
    
    // Project IDs for this user (for filtering requirements)
    const userProjectIds = userProjects.map(p => p.id);

    // Search projects with exact matches first, then fuzzy matches
    const matchedProjects = userProjects.filter(project => 
      exactMatch(project.name) || 
      (project.description && exactMatch(project.description))
    );

    // If we have fewer than the limit, add fuzzy matches
    if (matchedProjects.length < limit) {
      const fuzzyProjects = userProjects.filter(project => 
        !matchedProjects.includes(project) && (
          fuzzyMatch(project.name) || 
          (project.description && fuzzyMatch(project.description))
        )
      );
      matchedProjects.push(...fuzzyProjects.slice(0, limit - matchedProjects.length));
    }

    // Search requirements - only look in user's projects
    const matchedRequirements = Array.from(this.requirements.values())
      .filter(req => userProjectIds.includes(req.projectId))
      .filter(req => 
        exactMatch(req.description) || 
        exactMatch(req.category) || 
        (req.codeId && exactMatch(req.codeId))
      );

    // If we have fewer than the limit, add fuzzy matches
    if (matchedRequirements.length < limit) {
      const fuzzyRequirements = Array.from(this.requirements.values())
        .filter(req => userProjectIds.includes(req.projectId))
        .filter(req => 
          !matchedRequirements.includes(req) && (
            fuzzyMatch(req.description) || 
            fuzzyMatch(req.category) || 
            (req.codeId && fuzzyMatch(req.codeId))
          )
        );
      matchedRequirements.push(...fuzzyRequirements.slice(0, limit - matchedRequirements.length));
    }

    return {
      projects: matchedProjects.slice(0, limit),
      requirements: matchedRequirements.slice(0, limit)
    };
  }

  async advancedSearch(
    userId: number, 
    query: string, 
    filters: {
      entityTypes?: string[];
      projectId?: number;
      category?: string;
      priority?: string;
      dateRange?: { from?: Date; to?: Date };
    } = {}, 
    pagination: {
      page: number;
      limit: number;
    } = { page: 1, limit: 10 }
  ): Promise<{
    projects: Project[];
    requirements: Requirement[];
    inputData: InputData[];
    tasks: ImplementationTask[];
    totalResults: number;
    totalPages: number;
  }> {
    const searchTerm = query.toLowerCase().trim();
    const hasQuery = searchTerm.length > 0;
    
    // Determine entities to search based on filters
    const entityTypes = filters.entityTypes || ['projects', 'requirements', 'inputData', 'tasks'];
    const includeProjects = entityTypes.includes('projects');
    const includeRequirements = entityTypes.includes('requirements');
    const includeInputData = entityTypes.includes('inputData');
    const includeTasks = entityTypes.includes('tasks');

    // Get user's projects
    const userProjects = Array.from(this.projects.values()).filter(
      project => project.userId === userId
    );
    
    // Project IDs for this user (for filtering requirements, input data, tasks)
    const userProjectIds = userProjects.map(p => p.id);
    
    // Match function for strings
    const matchText = (text: string | null) => {
      if (!text || !hasQuery) return false;
      return text.toLowerCase().includes(searchTerm);
    };
    
    // Date filter function
    const matchesDateRange = (date: Date) => {
      if (!filters.dateRange) return true;
      
      if (filters.dateRange.from && date < filters.dateRange.from) {
        return false;
      }
      
      if (filters.dateRange.to) {
        // Set time to end of day
        const endDate = new Date(filters.dateRange.to);
        endDate.setHours(23, 59, 59, 999);
        if (date > endDate) {
          return false;
        }
      }
      
      return true;
    };

    // Search projects
    let matchedProjects: Project[] = [];
    if (includeProjects) {
      matchedProjects = userProjects.filter(project => 
        (!hasQuery || matchText(project.name) || matchText(project.description) || 
         matchText(project.sourceSystem) || matchText(project.targetSystem)) &&
        matchesDateRange(project.createdAt)
      );
    }

    // Search requirements
    let matchedRequirements: Requirement[] = [];
    if (includeRequirements) {
      const projectFilter = filters.projectId ? [filters.projectId] : userProjectIds;
      
      matchedRequirements = Array.from(this.requirements.values())
        .filter(req => 
          projectFilter.includes(req.projectId) &&
          (!hasQuery || matchText(req.description) || matchText(req.codeId) || matchText(req.source)) &&
          (!filters.category || req.category === filters.category) &&
          (!filters.priority || req.priority === filters.priority) &&
          matchesDateRange(req.createdAt)
        );
    }

    // Search input data
    let matchedInputData: InputData[] = [];
    if (includeInputData) {
      const projectFilter = filters.projectId ? [filters.projectId] : userProjectIds;
      
      matchedInputData = Array.from(this.inputDataItems.values())
        .filter(data => 
          projectFilter.includes(data.projectId) &&
          (!hasQuery || matchText(data.name) || matchText(data.type) || matchText(data.contentType)) &&
          matchesDateRange(data.createdAt)
        );
    }

    // Search implementation tasks
    let matchedTasks: ImplementationTask[] = [];
    if (includeTasks) {
      // Get all requirements for the user's projects
      const userRequirementIds = Array.from(this.requirements.values())
        .filter(req => userProjectIds.includes(req.projectId))
        .map(req => req.id);
        
      if (filters.projectId) {
        // Filter requirement IDs to only those in the selected project
        const projectRequirementIds = Array.from(this.requirements.values())
          .filter(req => req.projectId === filters.projectId)
          .map(req => req.id);
          
        matchedTasks = Array.from(this.implementationTasks.values())
          .filter(task => 
            projectRequirementIds.includes(task.requirementId) &&
            (!hasQuery || matchText(task.title) || matchText(task.description) || matchText(task.assignee)) &&
            (!filters.priority || task.priority === filters.priority) &&
            matchesDateRange(task.createdAt)
          );
      } else {
        matchedTasks = Array.from(this.implementationTasks.values())
          .filter(task => 
            userRequirementIds.includes(task.requirementId) &&
            (!hasQuery || matchText(task.title) || matchText(task.description) || matchText(task.assignee)) &&
            (!filters.priority || task.priority === filters.priority) &&
            matchesDateRange(task.createdAt)
          );
      }
    }

    // Calculate pagination
    const { page, limit } = pagination;
    const offset = (page - 1) * limit;
    
    // Calculate total results
    const totalResults = matchedProjects.length + matchedRequirements.length + 
                        matchedInputData.length + matchedTasks.length;
    
    // Calculate total pages
    const totalPages = Math.max(1, Math.ceil(totalResults / limit));

    // Apply pagination to each result set
    // This is a simplified approach - in a more advanced implementation,
    // we would need to interleave the results from different entities
    // based on relevance score and apply pagination to the combined results
    return {
      projects: matchedProjects.slice(0, limit),
      requirements: matchedRequirements.slice(0, limit),
      inputData: matchedInputData.slice(0, limit),
      tasks: matchedTasks.slice(0, limit),
      totalResults,
      totalPages
    };
  }
}

// PostgreSQL storage implementation using Drizzle ORM
export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    // Initialize session store with PostgreSQL
    this.sessionStore = new PostgresSessionStore({ 
      conObject: { 
        connectionString: process.env.DATABASE_URL 
      },
      createTableIfMissing: true 
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async authenticateUser(usernameOrEmail: string, password: string): Promise<User | undefined> {
    // In a real app, we would hash the password and compare with the stored hash
    const [user] = await db.select().from(users).where(
      or(
        eq(users.username, usernameOrEmail),
        eq(users.email, usernameOrEmail)
      )
    );
    
    if (user && user.password === password) {
      return user;
    }
    return undefined;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  // Invite methods
  async getInvite(token: string): Promise<Invite | undefined> {
    const [invite] = await db.select().from(invites).where(eq(invites.token, token));
    return invite;
  }

  async getInvitesByCreator(userId: number): Promise<Invite[]> {
    return await db.select().from(invites).where(eq(invites.createdById, userId));
  }

  async createInvite(invite: InsertInvite): Promise<Invite> {
    const [newInvite] = await db.insert(invites).values(invite).returning();
    return newInvite;
  }

  async markInviteAsUsed(token: string): Promise<Invite | undefined> {
    const [updatedInvite] = await db
      .update(invites)
      .set({ used: true })
      .where(eq(invites.token, token))
      .returning();
    return updatedInvite;
  }

  // Customer methods
  async getCustomer(id: number): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.id, id));
    return customer;
  }

  async getAllCustomers(): Promise<Customer[]> {
    return await db.select().from(customers);
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const [newCustomer] = await db.insert(customers).values(customer).returning();
    return newCustomer;
  }

  async updateCustomer(id: number, customerData: Partial<InsertCustomer>): Promise<Customer | undefined> {
    const [updatedCustomer] = await db
      .update(customers)
      .set({ ...customerData, updatedAt: new Date() })
      .where(eq(customers.id, id))
      .returning();
    
    return updatedCustomer;
  }

  async deleteCustomer(id: number): Promise<boolean> {
    const result = await db
      .delete(customers)
      .where(eq(customers.id, id));
    
    // Check if any rows were affected
    return result !== undefined && Object.keys(result).length > 0;
  }

  // Project methods
  async getProject(id: number): Promise<Project | undefined> {
    // Join with customers table to get customer details
    const [result] = await db
      .select({
        project: projects,
        customer: customers,
      })
      .from(projects)
      .leftJoin(customers, eq(projects.customerId, customers.id))
      .where(eq(projects.id, id));
    
    if (!result) return undefined;
    
    // Combine project with customer details
    const project = result.project;
    
    // Add customerDetails if customer exists
    if (result.customer) {
      const projectWithCustomer = {
        ...project,
        customerDetails: result.customer
      } as Project; // Type assertion needed here for TypeScript
      return projectWithCustomer;
    }
    
    return project;
  }

  async getProjects(userId: number): Promise<Project[]> {
    const results = await db
      .select({
        project: projects,
        customer: customers,
      })
      .from(projects)
      .leftJoin(customers, eq(projects.customerId, customers.id))
      .where(eq(projects.userId, userId));
    
    // Combine projects with their customer details
    return results.map(result => {
      if (result.customer) {
        return {
          ...result.project,
          customerDetails: result.customer
        } as Project; // Type assertion needed here for TypeScript
      }
      return result.project;
    });
  }

  async createProject(project: InsertProject): Promise<Project> {
    const [newProject] = await db.insert(projects).values(project).returning();
    return newProject;
  }

  async updateProject(id: number, projectData: Partial<InsertProject>): Promise<Project | undefined> {
    const [updatedProject] = await db
      .update(projects)
      .set(projectData)
      .where(eq(projects.id, id))
      .returning();
    return updatedProject;
  }

  async deleteProject(id: number): Promise<boolean> {
    const result = await db.delete(projects).where(eq(projects.id, id));
    return !!result;
  }

  // Input data methods
  async getInputData(id: number): Promise<InputData | undefined> {
    const [data] = await db.select().from(inputData).where(eq(inputData.id, id));
    return data;
  }

  async getInputDataByProject(projectId: number): Promise<InputData[]> {
    return await db.select().from(inputData).where(eq(inputData.projectId, projectId));
  }

  async createInputData(data: InsertInputData): Promise<InputData> {
    const [newData] = await db.insert(inputData).values(data).returning();
    return newData;
  }

  async updateInputData(id: number, data: Partial<InsertInputData>): Promise<InputData | undefined> {
    const [updatedData] = await db
      .update(inputData)
      .set(data)
      .where(eq(inputData.id, id))
      .returning();
    return updatedData;
  }

  async deleteInputData(id: number): Promise<boolean> {
    const result = await db.delete(inputData).where(eq(inputData.id, id));
    return !!result;
  }

  // Requirement methods
  async getRequirement(id: number): Promise<Requirement | undefined> {
    const [req] = await db.select().from(requirements).where(eq(requirements.id, id));
    return req;
  }

  async getRequirementWithProjectCheck(id: number, projectId: number): Promise<Requirement | undefined> {
    // First try the direct method with strict project ID check
    const [req] = await db.select()
      .from(requirements)
      .where(and(
        eq(requirements.id, id),
        eq(requirements.projectId, projectId)
      ));
    
    if (req) {
      return req;
    }
    
    // If not found with the project check, fetch the requirement to check its projectId
    const [fallbackReq] = await db.select()
      .from(requirements)
      .where(eq(requirements.id, id));
    
    // Only return the requirement if it exists AND:
    // 1. Its projectId matches the requested projectId, OR
    // 2. It has no projectId (legacy data) - in which case we'll associate it
    if (fallbackReq) {
      if (fallbackReq.projectId === projectId || fallbackReq.projectId === null) {
        // If it has no projectId, update it with the provided projectId for future requests
        if (fallbackReq.projectId === null) {
          await db.update(requirements)
            .set({ projectId })
            .where(eq(requirements.id, id));
          fallbackReq.projectId = projectId;
        }
        return fallbackReq;
      }
      
      // If projectId doesn't match, log it and return undefined
      console.log(`Requirement ${id} exists but belongs to project ${fallbackReq.projectId}, not ${projectId}`);
    }
    
    return undefined;
  }

  async getRequirementsByProject(projectId: number): Promise<Requirement[]> {
    return await db.select().from(requirements).where(eq(requirements.projectId, projectId));
  }

  async getRequirementsByInputData(inputDataId: number): Promise<Requirement[]> {
    return await db.select().from(requirements).where(eq(requirements.inputDataId, inputDataId));
  }

  async createRequirement(requirement: InsertRequirement): Promise<Requirement> {
    const [newRequirement] = await db.insert(requirements).values(requirement).returning();
    return newRequirement;
  }

  async updateRequirement(id: number, reqData: Partial<InsertRequirement>): Promise<Requirement | undefined> {
    const [updatedReq] = await db
      .update(requirements)
      .set(reqData)
      .where(eq(requirements.id, id))
      .returning();
    return updatedReq;
  }

  async deleteRequirement(id: number): Promise<boolean> {
    const result = await db.delete(requirements).where(eq(requirements.id, id));
    return !!result;
  }

  async getHighPriorityRequirements(projectId: number, limit: number = 10): Promise<Requirement[]> {
    // Use SQL ILIKE for case-insensitive matching of 'high' priority
    // This ensures we match 'high', 'High', or any case variation
    return await db
      .select()
      .from(requirements)
      .where(
        and(
          eq(requirements.projectId, projectId),
          // Consider both lowercase 'high' and uppercase 'High' due to potential inconsistency
          or(
            eq(requirements.priority, 'high'),
            eq(requirements.priority, 'High')
          )
        )
      )
      .orderBy(desc(requirements.createdAt))
      .limit(limit);
  }
  
  // Method to invalidate cached requirement data
  invalidateRequirementCache(id: number): void {
    // For DatabaseStorage, this ensures we don't have stale data
    console.log(`Invalidating database cache for requirement ID: ${id}`);
  }

  // Activity methods
  async getActivitiesByProject(projectId: number, limit: number = 10): Promise<Activity[]> {
    return await db
      .select()
      .from(activities)
      .where(eq(activities.projectId, projectId))
      .orderBy(desc(activities.createdAt))
      .limit(limit);
  }

  async getAllActivities(limit: number = 10): Promise<Activity[]> {
    return await db
      .select()
      .from(activities)
      .orderBy(desc(activities.createdAt))
      .limit(limit);
  }

  async createActivity(activity: InsertActivity): Promise<Activity> {
    const [newActivity] = await db.insert(activities).values(activity).returning();
    return newActivity;
  }

  // Implementation Task methods
  async getImplementationTask(id: number): Promise<ImplementationTask | undefined> {
    const [task] = await db.select().from(implementationTasks).where(eq(implementationTasks.id, id));
    return task;
  }

  async getImplementationTasksByRequirement(requirementId: number): Promise<ImplementationTask[]> {
    return await db
      .select()
      .from(implementationTasks)
      .where(eq(implementationTasks.requirementId, requirementId));
  }

  async createImplementationTask(task: InsertImplementationTask): Promise<ImplementationTask> {
    const [newTask] = await db.insert(implementationTasks).values(task).returning();
    return newTask;
  }

  async updateImplementationTask(id: number, taskData: Partial<InsertImplementationTask>): Promise<ImplementationTask | undefined> {
    const [updatedTask] = await db
      .update(implementationTasks)
      .set(taskData)
      .where(eq(implementationTasks.id, id))
      .returning();
    return updatedTask;
  }

  async deleteImplementationTask(id: number): Promise<boolean> {
    const result = await db.delete(implementationTasks).where(eq(implementationTasks.id, id));
    return !!result;
  }
  
  // Search methods - Uses a simpler approach to avoid SQL syntax complexities
  async quickSearch(userId: number, query: string, limit: number = 5): Promise<{
    projects: Project[];
    requirements: Requirement[];
  }> {
    // Skip search if query is empty
    if (!query || query.trim().length === 0) {
      return { projects: [], requirements: [] };
    }

    const searchTerm = query.toLowerCase().trim();
    
    // Get user's projects
    const userProjects = await db
      .select()
      .from(projects)
      .where(eq(projects.userId, userId));
    
    // Filter projects matching search term
    const matchedProjects = userProjects.filter(project => 
      project.name.toLowerCase().includes(searchTerm) || 
      (project.description && project.description.toLowerCase().includes(searchTerm))
    ).slice(0, limit);
    
    // Get requirements for user's projects
    const projectIds = userProjects.map(p => p.id);
    // Since inArray is not available, we'll get all requirements and filter in memory
    const allRequirements = await db
      .select()
      .from(requirements);
    
    // Filter to only requirements in the user's projects
    const filteredRequirements = allRequirements.filter(req => 
      projectIds.includes(req.projectId)
    );
    
    // Filter requirements matching search term
    const matchedRequirements = filteredRequirements.filter(req => 
      req.description.toLowerCase().includes(searchTerm) || 
      req.category.toLowerCase().includes(searchTerm) || 
      (req.codeId && req.codeId.toLowerCase().includes(searchTerm))
    ).slice(0, limit);

    return {
      projects: matchedProjects,
      requirements: matchedRequirements
    };
  }

  async advancedSearch(
    userId: number, 
    query: string, 
    filters: {
      entityTypes?: string[];
      projectId?: number;
      category?: string;
      priority?: string;
      dateRange?: { from?: Date; to?: Date };
    } = {}, 
    pagination: {
      page: number;
      limit: number;
    } = { page: 1, limit: 10 }
  ): Promise<{
    projects: Project[];
    requirements: Requirement[];
    inputData: InputData[];
    tasks: ImplementationTask[];
    totalResults: number;
    totalPages: number;
  }> {
    // This is a simplified implementation with in-memory filtering
    // to avoid SQL syntax complexities with the current adapter
    
    const searchTerm = query.toLowerCase().trim();
    const hasQuery = searchTerm.length > 0;
    
    // Determine entities to search based on filters
    const entityTypes = filters.entityTypes || ['projects', 'requirements', 'inputData', 'tasks'];
    const includeProjects = entityTypes.includes('projects');
    const includeRequirements = entityTypes.includes('requirements');
    const includeInputData = entityTypes.includes('inputData');
    const includeTasks = entityTypes.includes('tasks');

    // Get user's projects
    const userProjects = await db
      .select()
      .from(projects)
      .where(eq(projects.userId, userId));
    
    const projectIdList = userProjects.map(p => p.id);
    const { page, limit } = pagination;
    const offset = (page - 1) * limit;
    
    // Search projects
    let matchedProjects: Project[] = [];
    let projectsCount = 0;
    if (includeProjects) {
      let filtered = [...userProjects];
      
      // Apply text search filter
      if (hasQuery) {
        filtered = filtered.filter(p => 
          p.name.toLowerCase().includes(searchTerm) ||
          (p.description && p.description.toLowerCase().includes(searchTerm)) ||
          (p.sourceSystem && p.sourceSystem.toLowerCase().includes(searchTerm)) ||
          (p.targetSystem && p.targetSystem.toLowerCase().includes(searchTerm))
        );
      }
      
      // Apply date range filter
      if (filters.dateRange) {
        filtered = filtered.filter(p => {
          if (filters.dateRange?.from && p.createdAt < filters.dateRange.from) {
            return false;
          }
          if (filters.dateRange?.to) {
            const endDate = new Date(filters.dateRange.to);
            endDate.setHours(23, 59, 59, 999);
            if (p.createdAt > endDate) {
              return false;
            }
          }
          return true;
        });
      }
      
      projectsCount = filtered.length;
      matchedProjects = filtered.slice(offset, offset + limit);
    }
    
    // Search requirements
    let matchedRequirements: Requirement[] = [];
    let requirementsCount = 0;
    if (includeRequirements) {
      // Get all requirements
      const allRequirements = await db
        .select()
        .from(requirements);
      
      // Filter for user's projects or specific project
      let filtered = filters.projectId
        ? allRequirements.filter(r => r.projectId === filters.projectId)
        : allRequirements.filter(r => projectIdList.includes(r.projectId));
      
      // Apply text search filter
      if (hasQuery) {
        filtered = filtered.filter(r => 
          r.description.toLowerCase().includes(searchTerm) ||
          r.category.toLowerCase().includes(searchTerm) ||
          (r.codeId && r.codeId.toLowerCase().includes(searchTerm)) ||
          (r.source && r.source.toLowerCase().includes(searchTerm))
        );
      }
      
      // Apply category filter
      if (filters.category) {
        filtered = filtered.filter(r => r.category === filters.category);
      }
      
      // Apply priority filter
      if (filters.priority) {
        filtered = filtered.filter(r => r.priority === filters.priority);
      }
      
      // Apply date range filter
      if (filters.dateRange) {
        filtered = filtered.filter(r => {
          if (filters.dateRange?.from && r.createdAt < filters.dateRange.from) {
            return false;
          }
          if (filters.dateRange?.to) {
            const endDate = new Date(filters.dateRange.to);
            endDate.setHours(23, 59, 59, 999);
            if (r.createdAt > endDate) {
              return false;
            }
          }
          return true;
        });
      }
      
      requirementsCount = filtered.length;
      matchedRequirements = filtered.slice(offset, offset + limit);
    }
    
    // Search input data
    let matchedInputData: InputData[] = [];
    let inputDataCount = 0;
    if (includeInputData) {
      // Get all input data for the user's projects
      const allInputData = await db
        .select()
        .from(inputData);
        
      // Filter to user's projects or specific project
      let filtered = filters.projectId
        ? allInputData.filter(d => d.projectId === filters.projectId)
        : allInputData.filter(d => projectIdList.includes(d.projectId));
      
      // Apply text search filter
      if (hasQuery) {
        filtered = filtered.filter(d => 
          d.name.toLowerCase().includes(searchTerm) ||
          d.type.toLowerCase().includes(searchTerm) ||
          (d.contentType && d.contentType.toLowerCase().includes(searchTerm))
        );
      }
      
      // Apply date range filter
      if (filters.dateRange) {
        filtered = filtered.filter(d => {
          if (filters.dateRange?.from && d.createdAt < filters.dateRange.from) {
            return false;
          }
          if (filters.dateRange?.to) {
            const endDate = new Date(filters.dateRange.to);
            endDate.setHours(23, 59, 59, 999);
            if (d.createdAt > endDate) {
              return false;
            }
          }
          return true;
        });
      }
      
      inputDataCount = filtered.length;
      matchedInputData = filtered.slice(offset, offset + limit);
    }
    
    // Search implementation tasks
    let matchedTasks: ImplementationTask[] = [];
    let tasksCount = 0;
    if (includeTasks) {
      // Get all requirements
      const allRequirements = await db
        .select()
        .from(requirements);
        
      // Filter to user's projects or specific project
      const projectRequirements = filters.projectId
        ? allRequirements.filter(r => r.projectId === filters.projectId)
        : allRequirements.filter(r => projectIdList.includes(r.projectId));
      
      const requirementIds = projectRequirements.map(r => r.id);
      
      // Get all tasks
      const allTasks = await db
        .select()
        .from(implementationTasks);
        
      // Filter to tasks for the matching requirements
      const filteredTasks = allTasks.filter(task => 
        requirementIds.includes(task.requirementId)
      );
      
      let filtered = [...filteredTasks];
      
      // Apply text search filter
      if (hasQuery) {
        filtered = filtered.filter(t => 
          t.title.toLowerCase().includes(searchTerm) ||
          (t.description && t.description.toLowerCase().includes(searchTerm)) ||
          (t.assignee && t.assignee.toLowerCase().includes(searchTerm))
        );
      }
      
      // Apply priority filter
      if (filters.priority) {
        filtered = filtered.filter(t => t.priority === filters.priority);
      }
      
      // Apply date range filter
      if (filters.dateRange) {
        filtered = filtered.filter(t => {
          if (filters.dateRange?.from && t.createdAt < filters.dateRange.from) {
            return false;
          }
          if (filters.dateRange?.to) {
            const endDate = new Date(filters.dateRange.to);
            endDate.setHours(23, 59, 59, 999);
            if (t.createdAt > endDate) {
              return false;
            }
          }
          return true;
        });
      }
      
      tasksCount = filtered.length;
      matchedTasks = filtered.slice(offset, offset + limit);
    }
    
    // Calculate total results and pages
    const totalResults = projectsCount + requirementsCount + inputDataCount + tasksCount;
    const totalPages = Math.max(1, Math.ceil(totalResults / limit));
    
    return {
      projects: matchedProjects,
      requirements: matchedRequirements,
      inputData: matchedInputData,
      tasks: matchedTasks,
      totalResults,
      totalPages
    };
  }
}

// Use database storage if DATABASE_URL is available, otherwise fallback to in-memory storage
// This ensures we always use the database when available
export const storage = process.env.DATABASE_URL 
  ? new DatabaseStorage() 
  : new MemStorage();

// Log which storage system we're using
console.log(`Storage system: ${process.env.DATABASE_URL ? 'PostgreSQL Database' : 'In-Memory'}`);