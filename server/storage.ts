/**
 * Database Storage Module
 * 
 * This module contains the implementation of the storage interface using PostgreSQL.
 */
import { 
  users, type User, type InsertUser,
  invites, type Invite, type InsertInvite,
  projects, type Project, type InsertProject,
  customers, type Customer, type InsertCustomer,
  inputData, type InputData, type InsertInputData,
  requirements, type Requirement, type InsertRequirement,
  activities, type Activity, type InsertActivity,
  implementationTasks, type ImplementationTask, type InsertImplementationTask,
  documentTemplates, type DocumentTemplate, type InsertDocumentTemplate,
  documents, type Document, type InsertDocument,
  fieldMappings, type FieldMapping, type InsertFieldMapping
} from "@shared/schema";
import { ExtendedImplementationTask } from './extended-types';
import { and, desc, eq, or, like, sql as drizzleSql, gte, lte, inArray } from 'drizzle-orm';
import { db, sql } from './db';
import session from "express-session";
import connectPg from "connect-pg-simple";

// Create PostgreSQL session store
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
  getImplementationTask(id: number): Promise<ExtendedImplementationTask | undefined>;
  getImplementationTasksByRequirement(requirementId: number): Promise<ExtendedImplementationTask[]>;
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
    tasks: ExtendedImplementationTask[];
    totalResults: number;
    totalPages: number;
  }>;
}

// PostgreSQL Database Storage Implementation
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
    try {
      const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
      return result[0];
    } catch (error) {
      console.error('Error fetching user:', error);
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
      return result[0];
    } catch (error) {
      console.error('Error fetching user by username:', error);
      return undefined;
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
      return result[0];
    } catch (error) {
      console.error('Error fetching user by email:', error);
      return undefined;
    }
  }

  async authenticateUser(usernameOrEmail: string, password: string): Promise<User | undefined> {
    try {
      const result = await db.select().from(users).where(
        and(
          or(
            eq(users.username, usernameOrEmail),
            eq(users.email, usernameOrEmail)
          ),
          eq(users.password, password)
        )
      ).limit(1);
      
      return result[0];
    } catch (error) {
      console.error('Error authenticating user:', error);
      return undefined;
    }
  }

  async createUser(user: InsertUser): Promise<User> {
    try {
      const [newUser] = await db.insert(users).values(user).returning();
      return newUser;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    try {
      const [updatedUser] = await db.update(users)
        .set({ ...userData, updatedAt: new Date() })
        .where(eq(users.id, id))
        .returning();
      
      return updatedUser;
    } catch (error) {
      console.error('Error updating user:', error);
      return undefined;
    }
  }

  // Invite methods
  async getInvite(token: string): Promise<Invite | undefined> {
    try {
      const result = await db.select().from(invites).where(eq(invites.token, token)).limit(1);
      return result[0];
    } catch (error) {
      console.error('Error fetching invite:', error);
      return undefined;
    }
  }

  async getInvitesByCreator(userId: number): Promise<Invite[]> {
    try {
      return await db.select().from(invites).where(eq(invites.createdById, userId));
    } catch (error) {
      console.error('Error fetching invites by creator:', error);
      return [];
    }
  }

  async createInvite(invite: InsertInvite): Promise<Invite> {
    try {
      const [newInvite] = await db.insert(invites).values(invite).returning();
      return newInvite;
    } catch (error) {
      console.error('Error creating invite:', error);
      throw error;
    }
  }

  async markInviteAsUsed(token: string): Promise<Invite | undefined> {
    try {
      const [updatedInvite] = await db.update(invites)
        .set({ used: true })
        .where(eq(invites.token, token))
        .returning();
      
      return updatedInvite;
    } catch (error) {
      console.error('Error marking invite as used:', error);
      return undefined;
    }
  }

  // Customer methods
  async getCustomer(id: number): Promise<Customer | undefined> {
    try {
      const result = await db.select().from(customers).where(eq(customers.id, id)).limit(1);
      return result[0];
    } catch (error) {
      console.error('Error fetching customer:', error);
      return undefined;
    }
  }

  async getAllCustomers(): Promise<Customer[]> {
    try {
      return await db.select().from(customers).orderBy(customers.name);
    } catch (error) {
      console.error('Error fetching all customers:', error);
      return [];
    }
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    try {
      const [newCustomer] = await db.insert(customers).values(customer).returning();
      return newCustomer;
    } catch (error) {
      console.error('Error creating customer:', error);
      throw error;
    }
  }

  async updateCustomer(id: number, customerData: Partial<InsertCustomer>): Promise<Customer | undefined> {
    try {
      const [updatedCustomer] = await db.update(customers)
        .set({ ...customerData, updatedAt: new Date() })
        .where(eq(customers.id, id))
        .returning();
      
      return updatedCustomer;
    } catch (error) {
      console.error('Error updating customer:', error);
      return undefined;
    }
  }

  async deleteCustomer(id: number): Promise<boolean> {
    try {
      await db.delete(customers).where(eq(customers.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting customer:', error);
      return false;
    }
  }

  // Project methods
  async getProject(id: number): Promise<Project | undefined> {
    try {
      const result = await db.select({
        ...projects,
        customerDetails: customers
      })
      .from(projects)
      .leftJoin(customers, eq(projects.customerId, customers.id))
      .where(eq(projects.id, id))
      .limit(1);
      
      return result[0];
    } catch (error) {
      console.error('Error fetching project:', error);
      return undefined;
    }
  }

  async getProjects(userId: number): Promise<Project[]> {
    try {
      return await db.select({
        ...projects,
        customerDetails: customers
      })
      .from(projects)
      .leftJoin(customers, eq(projects.customerId, customers.id))
      .where(eq(projects.userId, userId))
      .orderBy(desc(projects.updatedAt));
    } catch (error) {
      console.error('Error fetching projects:', error);
      return [];
    }
  }

  async createProject(project: InsertProject): Promise<Project> {
    try {
      const [newProject] = await db.insert(projects).values(project).returning();
      
      // Fetch customer details if customerId is provided
      if (newProject.customerId) {
        const customerResult = await db.select().from(customers).where(eq(customers.id, newProject.customerId)).limit(1);
        if (customerResult.length > 0) {
          return {
            ...newProject,
            customerDetails: customerResult[0]
          };
        }
      }
      
      return newProject;
    } catch (error) {
      console.error('Error creating project:', error);
      throw error;
    }
  }

  async updateProject(id: number, projectData: Partial<InsertProject>): Promise<Project | undefined> {
    try {
      const [updatedProject] = await db.update(projects)
        .set({ ...projectData, updatedAt: new Date() })
        .where(eq(projects.id, id))
        .returning();
      
      // Fetch customer details if customerId is provided
      if (updatedProject.customerId) {
        const customerResult = await db.select().from(customers).where(eq(customers.id, updatedProject.customerId)).limit(1);
        if (customerResult.length > 0) {
          return {
            ...updatedProject,
            customerDetails: customerResult[0]
          };
        }
      }
      
      return updatedProject;
    } catch (error) {
      console.error('Error updating project:', error);
      return undefined;
    }
  }

  async deleteProject(id: number): Promise<boolean> {
    try {
      // Step 1: Delete related documents
      await db.delete(documents).where(eq(documents.projectId, id));
      
      // Step 2: Delete related field mappings (via document templates related to this project)
      const projectTemplates = await db.select().from(documentTemplates).where(eq(documentTemplates.projectId, id));
      if (projectTemplates.length > 0) {
        const templateIds = projectTemplates.map(template => template.id);
        await db.delete(fieldMappings).where(inArray(fieldMappings.templateId, templateIds));
        
        // Delete the project-specific templates
        await db.delete(documentTemplates).where(eq(documentTemplates.projectId, id));
      }
      
      // Step 3: Delete implementation tasks
      // First, get all requirements for this project
      const projectRequirements = await db.select().from(requirements).where(eq(requirements.projectId, id));
      if (projectRequirements.length > 0) {
        const requirementIds = projectRequirements.map(req => req.id);
        await db.delete(implementationTasks).where(inArray(implementationTasks.requirementId, requirementIds));
      }
      
      // Step 4: Delete project requirements 
      await db.delete(requirements).where(eq(requirements.projectId, id));
      
      // Step 5: Delete input data
      await db.delete(inputData).where(eq(inputData.projectId, id));
      
      // Step 6: Delete activities
      await db.delete(activities).where(eq(activities.projectId, id));
      
      // Step 7: Finally delete the project itself
      await db.delete(projects).where(eq(projects.id, id));
      
      return true;
    } catch (error) {
      console.error('Error deleting project:', error);
      return false;
    }
  }

  // Input data methods
  async getInputData(id: number): Promise<InputData | undefined> {
    try {
      const result = await db.select().from(inputData).where(eq(inputData.id, id)).limit(1);
      return result[0];
    } catch (error) {
      console.error('Error fetching input data:', error);
      return undefined;
    }
  }

  async getInputDataByProject(projectId: number): Promise<InputData[]> {
    try {
      return await db.select().from(inputData)
        .where(eq(inputData.projectId, projectId))
        .orderBy(desc(inputData.createdAt));
    } catch (error) {
      console.error('Error fetching input data by project:', error);
      return [];
    }
  }

  async createInputData(data: InsertInputData): Promise<InputData> {
    try {
      const [newInputData] = await db.insert(inputData).values(data).returning();
      return newInputData;
    } catch (error) {
      console.error('Error creating input data:', error);
      throw error;
    }
  }

  async updateInputData(id: number, data: Partial<InsertInputData>): Promise<InputData | undefined> {
    try {
      // If status is "completed", also set processed to true
      if (data.status === "completed") {
        data.processed = true;
      }
      
      const [updatedInputData] = await db.update(inputData)
        .set(data)
        .where(eq(inputData.id, id))
        .returning();
      
      return updatedInputData;
    } catch (error) {
      console.error('Error updating input data:', error);
      return undefined;
    }
  }

  async deleteInputData(id: number): Promise<boolean> {
    try {
      await db.delete(inputData).where(eq(inputData.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting input data:', error);
      return false;
    }
  }

  // Requirement methods
  async getRequirement(id: number): Promise<Requirement | undefined> {
    try {
      const result = await db.select().from(requirements).where(eq(requirements.id, id)).limit(1);
      return result[0];
    } catch (error) {
      console.error('Error fetching requirement:', error);
      return undefined;
    }
  }
  
  async getRequirementWithProjectCheck(id: number, projectId: number): Promise<Requirement | undefined> {
    try {
      const result = await db.select().from(requirements)
        .where(and(
          eq(requirements.id, id),
          eq(requirements.projectId, projectId)
        ))
        .limit(1);
      
      return result[0];
    } catch (error) {
      console.error('Error fetching requirement with project check:', error);
      return undefined;
    }
  }

  async getRequirementsByProject(projectId: number): Promise<Requirement[]> {
    try {
      return await db.select().from(requirements)
        .where(eq(requirements.projectId, projectId))
        .orderBy(desc(requirements.updatedAt));
    } catch (error) {
      console.error('Error fetching requirements by project:', error);
      return [];
    }
  }

  async getRequirementsByInputData(inputDataId: number): Promise<Requirement[]> {
    try {
      return await db.select().from(requirements)
        .where(eq(requirements.inputDataId, inputDataId))
        .orderBy(desc(requirements.updatedAt));
    } catch (error) {
      console.error('Error fetching requirements by input data:', error);
      return [];
    }
  }

  async createRequirement(requirement: InsertRequirement): Promise<Requirement> {
    try {
      const [newRequirement] = await db.insert(requirements).values(requirement).returning();
      return newRequirement;
    } catch (error) {
      console.error('Error creating requirement:', error);
      throw error;
    }
  }

  async updateRequirement(id: number, reqData: Partial<InsertRequirement>): Promise<Requirement | undefined> {
    try {
      const [updatedRequirement] = await db.update(requirements)
        .set({ ...reqData, updatedAt: new Date() })
        .where(eq(requirements.id, id))
        .returning();
      
      return updatedRequirement;
    } catch (error) {
      console.error('Error updating requirement:', error);
      return undefined;
    }
  }

  async deleteRequirement(id: number): Promise<boolean> {
    try {
      await db.delete(requirements).where(eq(requirements.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting requirement:', error);
      return false;
    }
  }

  async getHighPriorityRequirements(projectId: number, limit: number = 10): Promise<Requirement[]> {
    try {
      return await db.select().from(requirements)
        .where(and(
          eq(requirements.projectId, projectId),
          eq(requirements.priority, "high")
        ))
        .orderBy(desc(requirements.updatedAt))
        .limit(limit);
    } catch (error) {
      console.error('Error fetching high priority requirements:', error);
      return [];
    }
  }
  
  // Method to invalidate cached requirement data
  invalidateRequirementCache(id: number): void {
    // For DatabaseStorage, this ensures we don't have stale data
    console.log(`Invalidating cache for requirement ID: ${id}`);
  }

  // Activity methods
  async getActivitiesByProject(projectId: number, limit: number = 10): Promise<Activity[]> {
    try {
      return await db.select().from(activities)
        .where(eq(activities.projectId, projectId))
        .orderBy(desc(activities.createdAt))
        .limit(limit);
    } catch (error) {
      console.error('Error fetching activities by project:', error);
      return [];
    }
  }
  
  async getAllActivities(limit: number = 10): Promise<Activity[]> {
    try {
      return await db.select().from(activities)
        .orderBy(desc(activities.createdAt))
        .limit(limit);
    } catch (error) {
      console.error('Error fetching all activities:', error);
      return [];
    }
  }

  async createActivity(activity: InsertActivity): Promise<Activity> {
    try {
      const [newActivity] = await db.insert(activities).values(activity).returning();
      return newActivity;
    } catch (error) {
      console.error('Error creating activity:', error);
      throw error;
    }
  }

  // Implementation Task methods
  async getImplementationTask(id: number): Promise<ExtendedImplementationTask | undefined> {
    try {
      // First get the task
      const taskResult = await db.select().from(implementationTasks).where(eq(implementationTasks.id, id)).limit(1);
      if (taskResult.length === 0) return undefined;
      
      const task = taskResult[0];
      
      // Next get the requirement to determine projectId
      const reqResult = await db.select().from(requirements).where(eq(requirements.id, task.requirementId)).limit(1);
      if (reqResult.length === 0) {
        // Return task without project ID if requirement not found
        return task as ExtendedImplementationTask;
      }
      
      // Return task with project ID
      return {
        ...task,
        projectId: reqResult[0].projectId
      };
    } catch (error) {
      console.error('Error fetching implementation task:', error);
      return undefined;
    }
  }

  async getImplementationTasksByRequirement(requirementId: number): Promise<ExtendedImplementationTask[]> {
    try {
      // First get the tasks
      const tasks = await db.select().from(implementationTasks)
        .where(eq(implementationTasks.requirementId, requirementId))
        .orderBy(desc(implementationTasks.updatedAt));
      
      // Next get the requirement to determine projectId
      const reqResult = await db.select().from(requirements).where(eq(requirements.id, requirementId)).limit(1);
      if (reqResult.length === 0) {
        // Return tasks without project ID if requirement not found
        return tasks as ExtendedImplementationTask[];
      }
      
      // Return tasks with project ID
      return tasks.map(task => ({
        ...task,
        projectId: reqResult[0].projectId
      }));
    } catch (error) {
      console.error('Error fetching implementation tasks by requirement:', error);
      return [];
    }
  }

  async createImplementationTask(task: InsertImplementationTask): Promise<ImplementationTask> {
    try {
      const [newTask] = await db.insert(implementationTasks).values(task).returning();
      return newTask;
    } catch (error) {
      console.error('Error creating implementation task:', error);
      throw error;
    }
  }

  async updateImplementationTask(id: number, taskData: Partial<InsertImplementationTask>): Promise<ImplementationTask | undefined> {
    try {
      const [updatedTask] = await db.update(implementationTasks)
        .set({ ...taskData, updatedAt: new Date() })
        .where(eq(implementationTasks.id, id))
        .returning();
      
      return updatedTask;
    } catch (error) {
      console.error('Error updating implementation task:', error);
      return undefined;
    }
  }

  async deleteImplementationTask(id: number): Promise<boolean> {
    try {
      await db.delete(implementationTasks).where(eq(implementationTasks.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting implementation task:', error);
      return false;
    }
  }

  // Search methods
  async quickSearch(userId: number, query: string, limit: number = 5): Promise<{
    projects: Project[];
    requirements: Requirement[];
  }> {
    try {
      // Skip search if query is empty
      if (!query || query.trim().length === 0) {
        return { projects: [], requirements: [] };
      }

      console.log(`Performing quick search with query "${query}" for user ${userId}`);
      const searchTerm = `%${query.toLowerCase()}%`;
      
      // Define return arrays
      let projectResults: any[] = [];
      let requirementResults: any[] = [];
      
      // Use direct SQL queries for reliability
      try {
        // Get projects
        const projectsQuery = `
          SELECT p.id, p.name, p.description, p.user_id as "userId", 
                p.customer_id as "customerId", p.created_at as "createdAt", 
                p.updated_at as "updatedAt", p.source_system as "sourceSystem", 
                p.target_system as "targetSystem", p.type,
                c.name as "customerName", c.email as "customerEmail"
          FROM projects p
          LEFT JOIN customers c ON p.customer_id = c.id
          WHERE p.user_id = $1 
          AND (LOWER(p.name) LIKE $2 OR LOWER(p.description) LIKE $2)
          ORDER BY p.updated_at DESC
          LIMIT $3
        `;
        
        const projectData = await sql.query(projectsQuery, [userId, searchTerm, limit]);
        
        // Convert results to expected format
        projectResults = projectData.rows.map(p => ({
          id: p.id,
          name: p.name,
          description: p.description,
          type: p.type,
          userId: p.userId,
          customerId: p.customerId,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
          sourceSystem: p.sourceSystem,
          targetSystem: p.targetSystem,
          customer: p.customerName,
          customerDetails: p.customerName ? {
            id: p.customerId,
            name: p.customerName,
            email: p.customerEmail
          } : null
        }));
        
        console.log(`Quick search: Found ${projectResults.length} matching projects`);
      
        // Get requirements
        const requirementsQuery = `
          SELECT r.id, r.title, r.description, r.category, r.priority, 
                r.project_id as "projectId", r.created_at as "createdAt", 
                r.updated_at as "updatedAt", r.input_data_id as "inputDataId"
          FROM requirements r
          JOIN projects p ON r.project_id = p.id
          WHERE p.user_id = $1 
          AND (LOWER(r.title) LIKE $2 OR LOWER(r.description) LIKE $2 OR LOWER(r.category) LIKE $2)
          ORDER BY r.updated_at DESC
          LIMIT $3
        `;
        
        const requirementsData = await sql.query(requirementsQuery, [userId, searchTerm, limit]);
        requirementResults = requirementsData.rows;
        console.log(`Quick search: Found ${requirementResults.length} matching requirements`);
      
      } catch (sqlError) {
        console.error('SQL error during quick search:', sqlError);
      }
      
      return {
        projects: projectResults,
        requirements: requirementResults
      };
    } catch (error) {
      console.error('Error performing quick search:', error);
      return { projects: [], requirements: [] };
    }
  }

  async advancedSearch(
    userId: number, 
    query: string, 
    filters?: {
      entityTypes?: string[];
      projectId?: number;
      category?: string;
      priority?: string;
      dateRange?: { from?: Date; to?: Date };
    },
    pagination?: {
      page: number;
      limit: number;
    }
  ): Promise<{
    projects: Project[];
    requirements: Requirement[];
    inputData: InputData[];
    tasks: ExtendedImplementationTask[];
    totalResults: number;
    totalPages: number;
  }> {
    try {
      console.log(`Performing simplified search with query "${query}" for user ${userId}`);
      
      // Set up basic variables
      const page = pagination?.page || 1;
      const limit = pagination?.limit || 10;
      const offset = (page - 1) * limit;
      const searchTerm = query ? `%${query.toLowerCase()}%` : null;
      
      // Define empty result sets
      let projectResults: any[] = [];
      let requirementResults: any[] = [];
      let inputDataResults: any[] = [];
      let taskResults: any[] = [];
      
      // STEP 1: Directly query the database using simple SQL to avoid issues
      if (searchTerm) {
        try {
          // Get projects
          const projectsQuery = `
            SELECT p.id, p.name, p.description, p.user_id as "userId", 
                  p.customer_id as "customerId", p.created_at as "createdAt", 
                  p.updated_at as "updatedAt", p.source_system as "sourceSystem", 
                  p.target_system as "targetSystem", p.type,
                  c.name as "customerName", c.email as "customerEmail"
            FROM projects p
            LEFT JOIN customers c ON p.customer_id = c.id
            WHERE p.user_id = $1 
            AND (LOWER(p.name) LIKE $2 OR LOWER(p.description) LIKE $2)
            ORDER BY p.updated_at DESC
            LIMIT $3 OFFSET $4
          `;
          
          const projectData = await sql.query(projectsQuery, [userId, searchTerm, limit, offset]);
          projectResults = projectData.rows.map(p => ({
            id: p.id,
            name: p.name,
            description: p.description,
            type: p.type,
            userId: p.userId,
            customerId: p.customerId,
            createdAt: p.createdAt,
            updatedAt: p.updatedAt,
            sourceSystem: p.sourceSystem,
            targetSystem: p.targetSystem,
            customer: p.customerName,
            customerDetails: p.customerName ? {
              id: p.customerId,
              name: p.customerName,
              email: p.customerEmail
            } : null
          }));
          console.log(`Found ${projectResults.length} matching projects`);
          
          // Get requirements
          const requirementsQuery = `
            SELECT r.id, r.title, r.description, r.category, r.priority, 
                  r.project_id as "projectId", r.created_at as "createdAt", 
                  r.updated_at as "updatedAt", r.input_data_id as "inputDataId"
            FROM requirements r
            JOIN projects p ON r.project_id = p.id
            WHERE p.user_id = $1 
            AND (LOWER(r.title) LIKE $2 OR LOWER(r.description) LIKE $2 OR LOWER(r.category) LIKE $2)
            ORDER BY r.updated_at DESC
            LIMIT $3 OFFSET $4
          `;
          
          const requirementsData = await sql.query(requirementsQuery, [userId, searchTerm, limit, offset]);
          requirementResults = requirementsData.rows;
          console.log(`Found ${requirementResults.length} matching requirements`);
          
          // Get input data
          const inputDataQuery = `
            SELECT i.id, i.name, i.type, i.size, i.content_type as "contentType", 
                  i.project_id as "projectId", i.created_at as "createdAt", 
                  i.updated_at as "updatedAt", i.status
            FROM input_data i
            JOIN projects p ON i.project_id = p.id
            WHERE p.user_id = $1 
            AND (LOWER(i.name) LIKE $2 OR LOWER(i.content_type) LIKE $2)
            ORDER BY i.created_at DESC
            LIMIT $3 OFFSET $4
          `;
          
          const inputDataData = await sql.query(inputDataQuery, [userId, searchTerm, limit, offset]);
          inputDataResults = inputDataData.rows;
          console.log(`Found ${inputDataResults.length} matching input data items`);
          
          // Get tasks
          const tasksQuery = `
            SELECT t.id, t.title, t.description, t.requirement_id as "requirementId", 
                  t.status, t.priority, t.assigned_to as "assignedTo", 
                  t.created_at as "createdAt", t.updated_at as "updatedAt",
                  r.project_id as "projectId"
            FROM implementation_tasks t
            JOIN requirements r ON t.requirement_id = r.id
            JOIN projects p ON r.project_id = p.id
            WHERE p.user_id = $1 
            AND (LOWER(t.title) LIKE $2 OR LOWER(t.description) LIKE $2)
            ORDER BY t.updated_at DESC
            LIMIT $3 OFFSET $4
          `;
          
          const tasksData = await sql.query(tasksQuery, [userId, searchTerm, limit, offset]);
          taskResults = tasksData.rows;
          console.log(`Found ${taskResults.length} matching tasks`);
          
        } catch (sqlError) {
          console.error('SQL error during search:', sqlError);
        }
      }

      // Calculate total results
      const totalResults = projectResults.length + requirementResults.length + 
                           inputDataResults.length + taskResults.length;
      
      // Apply filters if needed (basic implementation)
      if (filters?.projectId) {
        // Filter by project ID if specified
        requirementResults = requirementResults.filter(r => r.projectId === filters.projectId);
        inputDataResults = inputDataResults.filter(i => i.projectId === filters.projectId);
        taskResults = taskResults.filter(t => t.projectId === filters.projectId);
      }
      
      if (filters?.category) {
        requirementResults = requirementResults.filter(r => r.category === filters.category);
      }
      
      if (filters?.priority) {
        requirementResults = requirementResults.filter(r => r.priority === filters.priority);
        taskResults = taskResults.filter(t => t.priority === filters.priority);
      }
      
      // Apply entityTypes filter if specified
      const entityTypes = filters?.entityTypes || ["projects", "requirements", "inputData", "tasks"];
      
      if (!entityTypes.includes("projects")) projectResults = [];
      if (!entityTypes.includes("requirements")) requirementResults = [];
      if (!entityTypes.includes("inputData")) inputDataResults = [];
      if (!entityTypes.includes("tasks")) taskResults = [];
      
      // Return results
      return {
        projects: projectResults,
        requirements: requirementResults,
        inputData: inputDataResults,
        tasks: taskResults,
        totalResults: totalResults,
        totalPages: Math.max(1, Math.ceil(totalResults / limit))
      };
    } catch (error) {
      console.error('Error performing advanced search:', error);
      return {
        projects: [],
        requirements: [],
        inputData: [],
        tasks: [],
        totalResults: 0,
        totalPages: 1
      };
    }
  }
}

// Always use database storage for persistence
export const storage = new DatabaseStorage();

// Log which storage system we're using
console.log(`Storage system: PostgreSQL Database`);
