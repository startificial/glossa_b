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
  fieldMappings, type FieldMapping, type InsertFieldMapping,
  workflows, type Workflow, type InsertWorkflow, type WorkflowNode, type WorkflowEdge,
  requirementComparisons, type RequirementComparison, type InsertRequirementComparison,
  requirementComparisonTasks, type RequirementComparisonTask, type InsertRequirementComparisonTask
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
  
  // Workflow methods
  getWorkflow(id: number): Promise<Workflow | undefined>;
  getWorkflowsByProject(projectId: number): Promise<Workflow[]>;
  getWorkflowsWithRequirementId(requirementId: number): Promise<Workflow[]>;
  createWorkflow(workflow: InsertWorkflow): Promise<Workflow>;
  updateWorkflow(id: number, workflow: Partial<InsertWorkflow>): Promise<Workflow | undefined>;
  deleteWorkflow(id: number): Promise<boolean>;
  
  // Requirement Comparison methods
  getRequirementComparisons(projectId: number): Promise<RequirementComparison[]>;
  getRequirementComparisonsByRequirementId(requirementId: number): Promise<RequirementComparison[]>;
  createRequirementComparison(comparison: InsertRequirementComparison): Promise<RequirementComparison>;
  deleteAllRequirementComparisons(projectId: number): Promise<boolean>;
  
  // Requirement Comparison Task methods
  getCurrentRequirementComparisonTask(projectId: number): Promise<RequirementComparisonTask | undefined>;
  createRequirementComparisonTask(task: InsertRequirementComparisonTask): Promise<RequirementComparisonTask>;
  updateRequirementComparisonTask(id: number, task: Partial<InsertRequirementComparisonTask>): Promise<RequirementComparisonTask | undefined>;
  markAllPreviousTasksAsNotCurrent(projectId: number): Promise<boolean>;
  
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
  
  // Workflow methods
  async getWorkflow(id: number): Promise<Workflow | undefined> {
    try {
      const result = await db.select().from(workflows).where(eq(workflows.id, id)).limit(1);
      return result[0];
    } catch (error) {
      console.error('Error fetching workflow:', error);
      return undefined;
    }
  }

  async getWorkflowsByProject(projectId: number): Promise<Workflow[]> {
    try {
      return await db.select().from(workflows)
        .where(eq(workflows.projectId, projectId))
        .orderBy(desc(workflows.updatedAt));
    } catch (error) {
      console.error('Error fetching workflows by project:', error);
      return [];
    }
  }

  async getWorkflowsWithRequirementId(requirementId: number): Promise<Workflow[]> {
    try {
      // This requires a more complex query as we need to look inside the JSON nodes
      // to find workflows that reference this requirement
      const rawResults = await sql`
        SELECT * FROM workflows 
        WHERE project_id IN (
          SELECT project_id FROM requirements WHERE id = ${requirementId}
        )
        AND EXISTS (
          SELECT 1 FROM jsonb_array_elements(nodes) as node
          WHERE node->'data'->>'requirementId' = ${requirementId.toString()}
        )
        ORDER BY updated_at DESC
      `;
      
      // Convert raw results to Workflow objects
      return rawResults.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        projectId: row.project_id,
        version: row.version,
        status: row.status,
        nodes: row.nodes,
        edges: row.edges,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
    } catch (error) {
      console.error('Error fetching workflows with requirement ID:', error);
      return [];
    }
  }

  async createWorkflow(workflow: InsertWorkflow): Promise<Workflow> {
    try {
      const [newWorkflow] = await db.insert(workflows).values(workflow).returning();
      return newWorkflow;
    } catch (error) {
      console.error('Error creating workflow:', error);
      throw error;
    }
  }

  async updateWorkflow(id: number, workflowData: Partial<InsertWorkflow>): Promise<Workflow | undefined> {
    try {
      const [updatedWorkflow] = await db.update(workflows)
        .set({ ...workflowData, updatedAt: new Date() })
        .where(eq(workflows.id, id))
        .returning();
      
      return updatedWorkflow;
    } catch (error) {
      console.error('Error updating workflow:', error);
      return undefined;
    }
  }

  async deleteWorkflow(id: number): Promise<boolean> {
    try {
      await db.delete(workflows).where(eq(workflows.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting workflow:', error);
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
      
      // Search projects with a safe approach to avoid circular references
      const projectsQuery = await db.select({
        id: projects.id,
        name: projects.name,
        description: projects.description,
        type: projects.type,
        userId: projects.userId,
        customerId: projects.customerId,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
        sourceSystem: projects.sourceSystem,
        targetSystem: projects.targetSystem,
        customerName: customers.name,
      })
      .from(projects)
      .leftJoin(customers, eq(projects.customerId, customers.id))
      .where(and(
        eq(projects.userId, userId),
        or(
          like(drizzleSql`lower(${projects.name})`, searchTerm),
          like(drizzleSql`lower(${projects.description})`, searchTerm)
        )
      ))
      .orderBy(desc(projects.updatedAt))
      .limit(limit);
      
      // Format project results properly
      const projectResults = projectsQuery.map(p => ({
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
        } : null
      }));
      
      // Search requirements with a safe approach
      const requirementsQuery = await db.select({
        id: requirements.id,
        title: requirements.title,
        description: requirements.description,
        category: requirements.category,
        priority: requirements.priority,
        projectId: requirements.projectId,
        createdAt: requirements.createdAt,
        updatedAt: requirements.updatedAt,
        codeId: requirements.codeId,
        text: requirements.description, // For display in search results
      })
      .from(requirements)
      .innerJoin(projects, eq(requirements.projectId, projects.id))
      .where(and(
        eq(projects.userId, userId),
        or(
          like(drizzleSql`lower(${requirements.title})`, searchTerm),
          like(drizzleSql`lower(${requirements.description})`, searchTerm),
          like(drizzleSql`lower(${requirements.category})`, searchTerm)
        )
      ))
      .orderBy(desc(requirements.updatedAt))
      .limit(limit);
      
      return {
        projects: projectResults,
        requirements: requirementsQuery
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
      console.log(`Performing advanced search with query "${query}" for user ${userId}`);
      
      // Set up basic variables
      const page = pagination?.page || 1;
      const limit = pagination?.limit || 10;
      const offset = (page - 1) * limit;
      const searchTerm = query ? `%${query.toLowerCase()}%` : '';
      
      // Define result arrays
      let projectResults: any[] = [];
      let requirementResults: any[] = [];
      let inputDataResults: any[] = [];
      let taskResults: any[] = [];
      
      // Only search if a query is provided
      if (query && query.trim()) {
        // Get entity types to search
        const entityTypes = filters?.entityTypes || ["projects", "requirements", "inputData", "tasks"];
        
        try {
          // 1. Search projects if included in entity types
          if (entityTypes.includes("projects")) {
            let projectQuery = db.select({
              id: projects.id,
              name: projects.name,
              description: projects.description,
              type: projects.type,
              userId: projects.userId,
              customerId: projects.customerId,
              createdAt: projects.createdAt,
              updatedAt: projects.updatedAt,
              sourceSystem: projects.sourceSystem,
              targetSystem: projects.targetSystem,
              customerName: customers.name,
            })
            .from(projects)
            .leftJoin(customers, eq(projects.customerId, customers.id))
            .where(and(
              eq(projects.userId, userId),
              or(
                like(drizzleSql`lower(${projects.name})`, searchTerm),
                like(drizzleSql`lower(${projects.description})`, searchTerm)
              )
            ))
            .orderBy(desc(projects.updatedAt))
            .limit(limit)
            .offset(offset);
            
            const projectsData = await projectQuery;
            
            // Format project results
            projectResults = projectsData.map(p => ({
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
              // Safely include only necessary customer details
              customerDetails: p.customerName && p.customerId ? {
                id: p.customerId,
                name: p.customerName,
              } : null
            }));
            console.log(`Found ${projectResults.length} matching projects`);
          }
          
          // 2. Search requirements if included in entity types
          if (entityTypes.includes("requirements")) {
            let reqQuery = db.select({
              id: requirements.id,
              title: requirements.title,
              description: requirements.description,
              category: requirements.category,
              priority: requirements.priority,
              projectId: requirements.projectId,
              createdAt: requirements.createdAt,
              updatedAt: requirements.updatedAt,
              codeId: requirements.codeId,
              inputDataId: requirements.inputDataId,
              text: requirements.description, // For display in search results
            })
            .from(requirements)
            .innerJoin(projects, eq(requirements.projectId, projects.id));
            
            // Apply projectId filter if available
            if (filters?.projectId) {
              reqQuery = reqQuery.where(and(
                eq(projects.userId, userId),
                eq(requirements.projectId, filters.projectId),
                or(
                  like(drizzleSql`lower(${requirements.title})`, searchTerm),
                  like(drizzleSql`lower(${requirements.description})`, searchTerm),
                  like(drizzleSql`lower(${requirements.category})`, searchTerm)
                )
              ));
            } else {
              reqQuery = reqQuery.where(and(
                eq(projects.userId, userId),
                or(
                  like(drizzleSql`lower(${requirements.title})`, searchTerm),
                  like(drizzleSql`lower(${requirements.description})`, searchTerm),
                  like(drizzleSql`lower(${requirements.category})`, searchTerm)
                )
              ));
            }
            
            // Apply category filter if available
            if (filters?.category) {
              reqQuery = reqQuery.where(eq(requirements.category, filters.category));
            }
            
            // Apply priority filter if available
            if (filters?.priority) {
              reqQuery = reqQuery.where(eq(requirements.priority, filters.priority));
            }
            
            // Apply date filters if available
            if (filters?.dateRange?.from) {
              reqQuery = reqQuery.where(gte(requirements.createdAt, filters.dateRange.from));
            }
            
            if (filters?.dateRange?.to) {
              reqQuery = reqQuery.where(lte(requirements.createdAt, filters.dateRange.to));
            }
            
            reqQuery = reqQuery.orderBy(desc(requirements.updatedAt))
              .limit(limit)
              .offset(offset);
            
            requirementResults = await reqQuery;
            console.log(`Found ${requirementResults.length} matching requirements`);
          }
          
          // 3. Search input data if included in entity types
          if (entityTypes.includes("inputData")) {
            let dataQuery = db.select({
              id: inputData.id,
              name: inputData.name,
              type: inputData.type,
              size: inputData.size,
              contentType: inputData.contentType,
              projectId: inputData.projectId,
              createdAt: inputData.createdAt,
              updatedAt: inputData.updatedAt,
              status: inputData.status,
            })
            .from(inputData)
            .innerJoin(projects, eq(inputData.projectId, projects.id));
            
            // Apply projectId filter if available
            if (filters?.projectId) {
              dataQuery = dataQuery.where(and(
                eq(projects.userId, userId),
                eq(inputData.projectId, filters.projectId),
                or(
                  like(drizzleSql`lower(${inputData.name})`, searchTerm),
                  like(drizzleSql`lower(${inputData.contentType})`, searchTerm)
                )
              ));
            } else {
              dataQuery = dataQuery.where(and(
                eq(projects.userId, userId),
                or(
                  like(drizzleSql`lower(${inputData.name})`, searchTerm),
                  like(drizzleSql`lower(${inputData.contentType})`, searchTerm)
                )
              ));
            }
            
            dataQuery = dataQuery.orderBy(desc(inputData.createdAt))
              .limit(limit)
              .offset(offset);
            
            inputDataResults = await dataQuery;
            console.log(`Found ${inputDataResults.length} matching input data items`);
          }
          
          // 4. Search implementation tasks if included in entity types
          if (entityTypes.includes("tasks")) {
            let tasksQuery = db.select({
              id: implementationTasks.id,
              title: implementationTasks.title,
              description: implementationTasks.description,
              requirementId: implementationTasks.requirementId,
              status: implementationTasks.status,
              priority: implementationTasks.priority,
              assignedTo: implementationTasks.assignedTo,
              createdAt: implementationTasks.createdAt,
              updatedAt: implementationTasks.updatedAt,
              projectId: requirements.projectId,
            })
            .from(implementationTasks)
            .innerJoin(requirements, eq(implementationTasks.requirementId, requirements.id))
            .innerJoin(projects, eq(requirements.projectId, projects.id));
            
            // Apply projectId filter if available
            if (filters?.projectId) {
              tasksQuery = tasksQuery.where(and(
                eq(projects.userId, userId),
                eq(requirements.projectId, filters.projectId),
                or(
                  like(drizzleSql`lower(${implementationTasks.title})`, searchTerm),
                  like(drizzleSql`lower(${implementationTasks.description})`, searchTerm)
                )
              ));
            } else {
              tasksQuery = tasksQuery.where(and(
                eq(projects.userId, userId),
                or(
                  like(drizzleSql`lower(${implementationTasks.title})`, searchTerm),
                  like(drizzleSql`lower(${implementationTasks.description})`, searchTerm)
                )
              ));
            }
            
            // Apply priority filter if available
            if (filters?.priority) {
              tasksQuery = tasksQuery.where(eq(implementationTasks.priority, filters.priority));
            }
            
            tasksQuery = tasksQuery.orderBy(desc(implementationTasks.updatedAt))
              .limit(limit)
              .offset(offset);
            
            taskResults = await tasksQuery;
            console.log(`Found ${taskResults.length} matching tasks`);
          }
        } catch (sqlError) {
          console.error('Error during search:', sqlError);
        }
      }
      
      // Calculate total results
      const totalResults = projectResults.length + requirementResults.length + 
                          inputDataResults.length + taskResults.length;
      
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

  // Requirement Comparison methods
  async getRequirementComparisons(projectId: number): Promise<RequirementComparison[]> {
    try {
      return await db.select().from(requirementComparisons)
        .where(eq(requirementComparisons.projectId, projectId))
        .orderBy(desc(requirementComparisons.comparedAt));
    } catch (error) {
      console.error('Error fetching requirement comparisons:', error);
      return [];
    }
  }

  async getRequirementComparisonsByRequirementId(requirementId: number): Promise<RequirementComparison[]> {
    try {
      return await db.select().from(requirementComparisons)
        .where(
          or(
            eq(requirementComparisons.requirementId1, requirementId),
            eq(requirementComparisons.requirementId2, requirementId)
          )
        )
        .orderBy(desc(requirementComparisons.comparedAt));
    } catch (error) {
      console.error('Error fetching requirement comparisons by requirement ID:', error);
      return [];
    }
  }

  async createRequirementComparison(comparison: InsertRequirementComparison): Promise<RequirementComparison> {
    try {
      const [newComparison] = await db.insert(requirementComparisons).values(comparison).returning();
      return newComparison;
    } catch (error) {
      console.error('Error creating requirement comparison:', error);
      throw error;
    }
  }

  async deleteAllRequirementComparisons(projectId: number): Promise<boolean> {
    try {
      await db.delete(requirementComparisons).where(eq(requirementComparisons.projectId, projectId));
      return true;
    } catch (error) {
      console.error('Error deleting requirement comparisons:', error);
      return false;
    }
  }

  // Requirement Comparison Task methods
  async getCurrentRequirementComparisonTask(projectId: number): Promise<RequirementComparisonTask | undefined> {
    try {
      const result = await db.select().from(requirementComparisonTasks)
        .where(
          and(
            eq(requirementComparisonTasks.projectId, projectId),
            eq(requirementComparisonTasks.isCurrent, true)
          )
        )
        .orderBy(desc(requirementComparisonTasks.startedAt))
        .limit(1);
      
      return result[0];
    } catch (error) {
      console.error('Error fetching current requirement comparison task:', error);
      return undefined;
    }
  }

  async createRequirementComparisonTask(task: InsertRequirementComparisonTask): Promise<RequirementComparisonTask> {
    try {
      // Mark all previous tasks as not current
      await this.markAllPreviousTasksAsNotCurrent(task.projectId);
      
      // Create new task
      const [newTask] = await db.insert(requirementComparisonTasks).values(task).returning();
      return newTask;
    } catch (error) {
      console.error('Error creating requirement comparison task:', error);
      throw error;
    }
  }

  async updateRequirementComparisonTask(id: number, task: Partial<InsertRequirementComparisonTask>): Promise<RequirementComparisonTask | undefined> {
    try {
      const [updatedTask] = await db.update(requirementComparisonTasks)
        .set(task)
        .where(eq(requirementComparisonTasks.id, id))
        .returning();
      
      return updatedTask;
    } catch (error) {
      console.error('Error updating requirement comparison task:', error);
      return undefined;
    }
  }

  async markAllPreviousTasksAsNotCurrent(projectId: number): Promise<boolean> {
    try {
      await db.update(requirementComparisonTasks)
        .set({ isCurrent: false })
        .where(
          and(
            eq(requirementComparisonTasks.projectId, projectId),
            eq(requirementComparisonTasks.isCurrent, true)
          )
        );
      
      return true;
    } catch (error) {
      console.error('Error marking previous tasks as not current:', error);
      return false;
    }
  }
}

// Always use database storage for persistence
export const storage = new DatabaseStorage();

// Log which storage system we're using
console.log(`Storage system: PostgreSQL Database`);
