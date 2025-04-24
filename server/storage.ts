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
  requirementComparisonTasks, type RequirementComparisonTask, type InsertRequirementComparisonTask,
  projectRoleTemplates, type ProjectRoleTemplate, type InsertProjectRoleTemplate,
  projectRoles, type ProjectRole, type InsertProjectRole,
  requirementRoleEfforts, type RequirementRoleEffort, type InsertRequirementRoleEffort,
  taskRoleEfforts, type TaskRoleEffort, type InsertTaskRoleEffort,
  applicationSettings, type ApplicationSettings, type InsertApplicationSettings
} from "@shared/schema";
import { ExtendedImplementationTask } from './extended-types';
import { and, desc, eq, or, like, sql as drizzleSql, gte, lte, inArray } from 'drizzle-orm';
import { db, pool } from './db';
import session from "express-session";
import connectPg from "connect-pg-simple";

// Create PostgreSQL session store
const PostgresSessionStore = connectPg(session);

// Storage interface with session store
export interface IStorage {
  // Session store for Express
  sessionStore: session.Store;
  
  // User methods
  getUser(id: number): Promise<User | null>;
  getUserByUsername(username: string): Promise<User | null>;
  getUserByEmail(email: string): Promise<User | null>;
  getAllUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, userData: Partial<InsertUser>): Promise<User | null>;
  authenticateUser(usernameOrEmail: string, password: string): Promise<User | null>;
  
  // Password reset methods
  getUserByResetToken(token: string): Promise<User | null>;
  saveResetToken(userId: number, token: string, expiresAt: Date): Promise<boolean>;
  updatePasswordAndClearToken(userId: number, hashedPassword: string): Promise<boolean>;

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
  
  // Project Role methods
  getProjectRole(id: number): Promise<ProjectRole | undefined>;
  getProjectRoles(projectId: number): Promise<ProjectRole[]>;
  createProjectRole(role: InsertProjectRole): Promise<ProjectRole>;
  updateProjectRole(id: number, role: Partial<InsertProjectRole>): Promise<ProjectRole | undefined>;
  deleteProjectRole(id: number): Promise<boolean>;
  createProjectRolesFromTemplates(projectId: number, templateIds: string[]): Promise<ProjectRole[]>;
  
  // Requirement Role Effort methods
  getRequirementRoleEfforts(requirementId: number): Promise<RequirementRoleEffort[]>;
  createRequirementRoleEffort(effort: InsertRequirementRoleEffort): Promise<RequirementRoleEffort>;
  updateRequirementRoleEffort(id: number, effort: Partial<InsertRequirementRoleEffort>): Promise<RequirementRoleEffort | undefined>;
  deleteRequirementRoleEffort(id: number): Promise<boolean>;
  
  // Task Role Effort methods
  getTaskRoleEfforts(taskId: number): Promise<TaskRoleEffort[]>;
  createTaskRoleEffort(effort: InsertTaskRoleEffort): Promise<TaskRoleEffort>;
  updateTaskRoleEffort(id: number, effort: Partial<InsertTaskRoleEffort>): Promise<TaskRoleEffort | undefined>;
  deleteTaskRoleEffort(id: number): Promise<boolean>;

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
  
  // Application Settings methods
  getApplicationSettings(): Promise<ApplicationSettings | undefined>;
  getApplicationSettingsData(): Promise<Record<string, any> | undefined>;
  updateApplicationSettings(userId: number, settingsData: Record<string, any>): Promise<ApplicationSettings | undefined>;
  createDefaultApplicationSettings(userId: number): Promise<ApplicationSettings>;
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
  async getUser(id: number): Promise<User | null> {
    try {
      const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
      return result[0] || null;
    } catch (error) {
      console.error('Error fetching user:', error);
      return null;
    }
  }

  async getUserByUsername(username: string): Promise<User | null> {
    try {
      const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
      return result[0] || null;
    } catch (error) {
      console.error('Error fetching user by username:', error);
      return null;
    }
  }

  async getUserByEmail(email: string): Promise<User | null> {
    try {
      const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
      return result[0] || null;
    } catch (error) {
      console.error('Error fetching user by email:', error);
      return null;
    }
  }
  
  async getAllUsers(): Promise<User[]> {
    try {
      const result = await db.select().from(users).orderBy(users.username);
      return result;
    } catch (error) {
      console.error('Error fetching all users:', error);
      return [];
    }
  }

  async authenticateUser(usernameOrEmail: string, password: string): Promise<User | null> {
    try {
      // First, look up the user by username or email (without checking password yet)
      const result = await db.select().from(users).where(
        or(
          eq(users.username, usernameOrEmail),
          eq(users.email, usernameOrEmail)
        )
      ).limit(1);
      
      const user = result[0];
      
      // If no user is found, return null
      if (!user) {
        return null;
      }
      
      // Import the standardized comparePasswords utility function
      const { comparePasswords } = await import('./utils/password-utils');
      
      // Verify the password using the standardized function
      const passwordMatches = await comparePasswords(password, user.password);
      console.log(`[DEBUG] authenticateUser: Password verification result: ${passwordMatches}`);
      
      // If password doesn't match, return null
      if (!passwordMatches) {
        return null;
      }
      
      // Password matches, return the user
      return user;
    } catch (error) {
      console.error('Error authenticating user:', error);
      return null;
    }
  }

  async createUser(user: InsertUser): Promise<User> {
    try {
      // Import the standardized hashPassword utility function
      const { hashPassword } = await import('./utils/password-utils');
      
      // Hash the password before storing it
      const hashedPassword = await hashPassword(user.password);
      console.log(`[DEBUG] createUser: Password hashed successfully. Format: ${hashedPassword.substring(0, 10)}...`);
      
      // Create the user with the hashed password
      const [newUser] = await db.insert(users).values({
        ...user,
        password: hashedPassword
      }).returning();
      
      return newUser;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | null> {
    try {
      let dataToUpdate = { ...userData, updatedAt: new Date() };
      
      // If password is being updated, hash it
      if (userData.password) {
        // Import the standardized hashPassword utility function
        const { hashPassword } = await import('./utils/password-utils');
        
        // Hash the new password
        const hashedPassword = await hashPassword(userData.password);
        console.log(`[DEBUG] updateUser: Password hashed successfully. Format: ${hashedPassword.substring(0, 10)}...`);
        
        // Update the data object with the hashed password
        dataToUpdate = { ...dataToUpdate, password: hashedPassword };
      }
      
      // Update the user record
      const [updatedUser] = await db.update(users)
        .set(dataToUpdate)
        .where(eq(users.id, id))
        .returning();
      
      return updatedUser || null;
    } catch (error) {
      console.error('Error updating user:', error);
      return null;
    }
  }
  
  // Password reset methods
  async getUserByResetToken(token: string): Promise<User | null> {
    try {
      const result = await db.select()
        .from(users)
        .where(eq(users.resetPasswordToken, token))
        .limit(1);
      
      return result[0] || null;
    } catch (error) {
      console.error('Error finding user by reset token:', error);
      return null;
    }
  }
  
  async saveResetToken(userId: number, token: string, expiresAt: Date): Promise<boolean> {
    try {
      await db.update(users)
        .set({ 
          resetPasswordToken: token,
          resetPasswordExpires: expiresAt,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));
      
      return true;
    } catch (error) {
      console.error('Error saving reset token:', error);
      return false;
    }
  }
  
  async updatePasswordAndClearToken(userId: number, hashedPassword: string): Promise<boolean> {
    try {
      console.log(`[DEBUG] updatePasswordAndClearToken: Updating password for user ID ${userId}`);
      console.log(`[DEBUG] updatePasswordAndClearToken: New hashed password: ${hashedPassword.substring(0, 15)}...`);
      
      // Import the sql function from our db.ts module
      const { sql } = await import('./db');
      
      // Execute the update using the direct SQL approach
      const updateResult = await sql`
        UPDATE users 
        SET password = ${hashedPassword}, 
            reset_password_token = NULL,
            reset_password_expires = NULL,
            updated_at = NOW() 
        WHERE id = ${userId} 
        RETURNING id, username, password
      `;
      
      if (!updateResult || updateResult.length === 0) {
        console.error(`[ERROR] updatePasswordAndClearToken: Update failed, no rows returned`);
        return false;
      }
      
      console.log(`[DEBUG] updatePasswordAndClearToken: Update successful for user ${updateResult[0].username}`);
      console.log(`[DEBUG] updatePasswordAndClearToken: Updated password in DB: ${updateResult[0].password.substring(0, 15)}...`);
      
      // Verify the password was stored correctly
      if (updateResult[0].password !== hashedPassword) {
        console.error('[ERROR] updatePasswordAndClearToken: Password mismatch after update!');
        console.log(`[DEBUG] updatePasswordAndClearToken: Expected: ${hashedPassword.substring(0, 20)}...`);
        console.log(`[DEBUG] updatePasswordAndClearToken: Actual: ${updateResult[0].password.substring(0, 20)}...`);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error updating password and clearing token:', error);
      return false;
    }
  }
  
  async updateUserPassword(userId: number, hashedPassword: string): Promise<User | null> {
    try {
      // This function is specifically designed for user-initiated password changes
      // It uses direct SQL for reliable password updates
      console.log(`[DEBUG] updateUserPassword: Updating password for user ID ${userId}`);
      console.log(`[DEBUG] updateUserPassword: New hashed password: ${hashedPassword.substring(0, 15)}...`);
      
      // Import the SQL client
      const { sql } = await import('./db');
      
      // Get current user data for verification
      const userData = await sql`
        SELECT id, username, password 
        FROM users 
        WHERE id = ${userId}
      `;
      
      if (!userData || userData.length === 0) {
        console.error(`[ERROR] updateUserPassword: User not found with ID ${userId}`);
        return null;
      }
      
      console.log(`[DEBUG] updateUserPassword: Found user ${userData[0].username}`);
      console.log(`[DEBUG] updateUserPassword: Current password: ${userData[0].password.substring(0, 15)}...`);
      
      // Use direct SQL to update the password - this has been verified to work reliably
      console.log(`[DEBUG] updateUserPassword: Executing direct SQL update...`);
      const updateResult = await sql`
        UPDATE users 
        SET password = ${hashedPassword}, 
            updated_at = NOW() 
        WHERE id = ${userId} 
        RETURNING *
      `;
      
      if (!updateResult || updateResult.length === 0) {
        console.error(`[ERROR] updateUserPassword: Update failed, no rows returned`);
        return null;
      }
      
      console.log(`[DEBUG] updateUserPassword: Update successful for user ${updateResult[0].username}`);
      console.log(`[DEBUG] updateUserPassword: Password in DB after update: ${updateResult[0].password.substring(0, 15)}...`);
      
      // Verify the update succeeded by retrieving the user again
      const verifyResult = await sql`
        SELECT id, username, password 
        FROM users 
        WHERE id = ${userId}
      `;
      
      if (!verifyResult || verifyResult.length === 0) {
        console.error(`[ERROR] updateUserPassword: Verification failed, user not found`);
        return null;
      }
      
      // Check if password was actually updated
      if (verifyResult[0].password === hashedPassword) {
        console.log(`[DEBUG] updateUserPassword: Password update verification confirmed`);
      } else {
        console.error(`[ERROR] updateUserPassword: Password mismatch after update!`);
        console.log(`[DEBUG] updateUserPassword: Expected: ${hashedPassword.substring(0, 20)}...`);
        console.log(`[DEBUG] updateUserPassword: Actual: ${verifyResult[0].password.substring(0, 20)}...`);
        return null;
      }
      
      // Convert SQL result to User type
      const user: User = {
        id: verifyResult[0].id,
        username: verifyResult[0].username,
        password: verifyResult[0].password,
        firstName: verifyResult[0].first_name,
        lastName: verifyResult[0].last_name,
        email: verifyResult[0].email,
        role: verifyResult[0].role,
        company: verifyResult[0].company,
        avatarUrl: verifyResult[0].avatar_url,
        invitedBy: verifyResult[0].invited_by,
        resetPasswordToken: verifyResult[0].reset_password_token,
        resetPasswordExpires: verifyResult[0].reset_password_expires,
        isDemo: verifyResult[0].is_demo || false,
        createdAt: new Date(verifyResult[0].created_at),
        updatedAt: new Date(verifyResult[0].updated_at)
      };
      
      console.log(`[DEBUG] updateUserPassword: Password updated successfully`);
      return user;
    } catch (error) {
      console.error('Error updating user password:', error);
      return null;
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
  
  // Project Role Template methods
  async getProjectRoleTemplate(id: number): Promise<ProjectRoleTemplate | undefined> {
    try {
      const result = await db.select().from(projectRoleTemplates).where(eq(projectRoleTemplates.id, id)).limit(1);
      return result[0];
    } catch (error) {
      console.error('Error fetching project role template:', error);
      return undefined;
    }
  }

  async getAllProjectRoleTemplates(): Promise<ProjectRoleTemplate[]> {
    try {
      return await db.select()
        .from(projectRoleTemplates)
        .orderBy(projectRoleTemplates.name);
    } catch (error) {
      console.error('Error fetching all project role templates:', error);
      return [];
    }
  }

  async getActiveProjectRoleTemplates(): Promise<ProjectRoleTemplate[]> {
    try {
      return await db.select()
        .from(projectRoleTemplates)
        .where(eq(projectRoleTemplates.isActive, true))
        .orderBy(projectRoleTemplates.name);
    } catch (error) {
      console.error('Error fetching active project role templates:', error);
      return [];
    }
  }

  async createProjectRoleTemplate(template: InsertProjectRoleTemplate): Promise<ProjectRoleTemplate> {
    try {
      const [newTemplate] = await db.insert(projectRoleTemplates).values(template).returning();
      return newTemplate;
    } catch (error) {
      console.error('Error creating project role template:', error);
      throw error;
    }
  }

  async updateProjectRoleTemplate(id: number, templateData: Partial<InsertProjectRoleTemplate>): Promise<ProjectRoleTemplate | undefined> {
    try {
      const [updatedTemplate] = await db.update(projectRoleTemplates)
        .set({ ...templateData, updatedAt: new Date() })
        .where(eq(projectRoleTemplates.id, id))
        .returning();
      
      return updatedTemplate;
    } catch (error) {
      console.error('Error updating project role template:', error);
      return undefined;
    }
  }

  async deleteProjectRoleTemplate(id: number): Promise<boolean> {
    try {
      await db.delete(projectRoleTemplates).where(eq(projectRoleTemplates.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting project role template:', error);
      return false;
    }
  }

  // Project Role methods
  async getProjectRole(id: number): Promise<ProjectRole | undefined> {
    try {
      const result = await db.select().from(projectRoles).where(eq(projectRoles.id, id)).limit(1);
      return result[0];
    } catch (error) {
      console.error('Error fetching project role:', error);
      return undefined;
    }
  }
  
  async createProjectRolesFromTemplates(projectId: number, templateIds: string[]): Promise<ProjectRole[]> {
    try {
      console.log(`Creating project roles for project ${projectId} with template IDs:`, templateIds);
      
      // Get application settings to access templates
      const appSettingsData = await this.getApplicationSettingsData();
      
      // Log the application settings data for debugging
      console.log('Application settings data:', JSON.stringify(appSettingsData, null, 2));
      
      if (!appSettingsData || !appSettingsData.templates || !appSettingsData.templates.projectRoleTemplates) {
        console.error('No project role templates found in application settings');
        return [];
      }
      
      const allTemplates = appSettingsData.templates.projectRoleTemplates;
      console.log('All available templates:', allTemplates);
      
      // Match templates by ID, making sure to handle string/number type conversions
      const selectedTemplates = allTemplates.filter(template => {
        const templateIdStr = String(template.id);
        return templateIds.some(id => String(id) === templateIdStr);
      });
      
      console.log('Selected templates:', selectedTemplates);
      
      if (selectedTemplates.length === 0) {
        console.error('No matching templates found for the provided template IDs');
        return [];
      }
      
      // Convert templates to project roles
      const rolesToCreate = selectedTemplates.map(template => ({
        projectId,
        name: template.name,
        roleType: template.roleType,
        locationType: template.locationType,
        seniorityLevel: template.seniorityLevel,
        description: template.description,
        costRate: template.costRate,
        costUnit: template.costUnit,
        currency: template.currency,
        isActive: template.isActive
      }));
      
      console.log('Creating roles:', rolesToCreate);
      
      // Insert all project roles
      const createdRoles = await db.insert(projectRoles).values(rolesToCreate).returning();
      console.log(`Created ${createdRoles.length} project roles`);
      return createdRoles;
    } catch (error) {
      console.error('Error creating project roles from templates:', error);
      return [];
    }
  }

  async getProjectRoles(projectId: number): Promise<ProjectRole[]> {
    try {
      return await db.select()
        .from(projectRoles)
        .where(eq(projectRoles.projectId, projectId))
        .orderBy(projectRoles.name);
    } catch (error) {
      console.error('Error fetching project roles:', error);
      return [];
    }
  }

  async createProjectRole(role: InsertProjectRole): Promise<ProjectRole> {
    try {
      const [newRole] = await db.insert(projectRoles).values(role).returning();
      return newRole;
    } catch (error) {
      console.error('Error creating project role:', error);
      throw error;
    }
  }

  async updateProjectRole(id: number, roleData: Partial<InsertProjectRole>): Promise<ProjectRole | undefined> {
    try {
      const [updatedRole] = await db.update(projectRoles)
        .set({ ...roleData, updatedAt: new Date() })
        .where(eq(projectRoles.id, id))
        .returning();
      
      return updatedRole;
    } catch (error) {
      console.error('Error updating project role:', error);
      return undefined;
    }
  }

  async deleteProjectRole(id: number): Promise<boolean> {
    try {
      await db.delete(projectRoles).where(eq(projectRoles.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting project role:', error);
      return false;
    }
  }
  
  // Requirement Role Effort methods
  async getRequirementRoleEfforts(requirementId: number): Promise<RequirementRoleEffort[]> {
    try {
      const efforts = await db.select()
        .from(requirementRoleEfforts)
        .where(eq(requirementRoleEfforts.requirementId, requirementId));
      
      return efforts;
    } catch (error) {
      console.error('Error fetching requirement role efforts:', error);
      return [];
    }
  }

  async createRequirementRoleEffort(effort: InsertRequirementRoleEffort): Promise<RequirementRoleEffort> {
    try {
      const [newEffort] = await db.insert(requirementRoleEfforts).values(effort).returning();
      return newEffort;
    } catch (error) {
      console.error('Error creating requirement role effort:', error);
      throw error;
    }
  }

  async updateRequirementRoleEffort(id: number, effortData: Partial<InsertRequirementRoleEffort>): Promise<RequirementRoleEffort | undefined> {
    try {
      const [updatedEffort] = await db.update(requirementRoleEfforts)
        .set({ ...effortData, updatedAt: new Date() })
        .where(eq(requirementRoleEfforts.id, id))
        .returning();
      
      return updatedEffort;
    } catch (error) {
      console.error('Error updating requirement role effort:', error);
      return undefined;
    }
  }

  async deleteRequirementRoleEffort(id: number): Promise<boolean> {
    try {
      await db.delete(requirementRoleEfforts).where(eq(requirementRoleEfforts.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting requirement role effort:', error);
      return false;
    }
  }
  
  // Task Role Effort methods
  async getTaskRoleEfforts(taskId: number): Promise<TaskRoleEffort[]> {
    try {
      const efforts = await db.select()
        .from(taskRoleEfforts)
        .where(eq(taskRoleEfforts.taskId, taskId));
      
      return efforts;
    } catch (error) {
      console.error('Error fetching task role efforts:', error);
      return [];
    }
  }

  async createTaskRoleEffort(effort: InsertTaskRoleEffort): Promise<TaskRoleEffort> {
    try {
      const [newEffort] = await db.insert(taskRoleEfforts).values(effort).returning();
      return newEffort;
    } catch (error) {
      console.error('Error creating task role effort:', error);
      throw error;
    }
  }

  async updateTaskRoleEffort(id: number, effortData: Partial<InsertTaskRoleEffort>): Promise<TaskRoleEffort | undefined> {
    try {
      const [updatedEffort] = await db.update(taskRoleEfforts)
        .set({ ...effortData, updatedAt: new Date() })
        .where(eq(taskRoleEfforts.id, id))
        .returning();
      
      return updatedEffort;
    } catch (error) {
      console.error('Error updating task role effort:', error);
      return undefined;
    }
  }

  async deleteTaskRoleEffort(id: number): Promise<boolean> {
    try {
      await db.delete(taskRoleEfforts).where(eq(taskRoleEfforts.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting task role effort:', error);
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
      // Instead of getting just the most recent activities which might all be from one user,
      // we'll get some activities from each user to ensure balanced representation
      
      // First, find distinct user IDs that have activities
      const distinctUsers = await db.select({
        userId: activities.userId
      })
      .from(activities)
      .groupBy(activities.userId);
      
      const userIds = distinctUsers.map(u => u.userId);
      console.log(`[DEBUG] Found activity records for ${userIds.length} distinct users:`, userIds);
      
      if (userIds.length === 0) {
        return [];
      }
      
      // Get activities balanced across users
      // For better distribution, we'll get some recent activities from each user
      const allActivities: Activity[] = [];
      
      // Get most recent activities for each user
      for (const userId of userIds) {
        const userActivities = await db.select()
          .from(activities)
          .where(eq(activities.userId, userId))
          .orderBy(desc(activities.createdAt))
          .limit(Math.max(2, Math.floor(limit / userIds.length))); // At least 2 per user
          
        allActivities.push(...userActivities);
      }
      
      // Sort combined results by date and limit to requested number
      const result = allActivities
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, limit);
      
      console.log(`[DEBUG] getAllActivities: Returning ${result.length} activities from ${userIds.length} users`);
      
      return result;
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
      // Import the sql function from our db.ts module
      const { sql } = await import('./db');
      
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
  
  // Application Settings methods
  
  /**
   * Get application settings
   * Retrieves the global application settings record
   * 
   * @returns The application settings or undefined if not found
   */
  async getApplicationSettings(): Promise<ApplicationSettings | undefined> {
    try {
      const result = await db.select().from(applicationSettings).limit(1);
      return result[0];
    } catch (error) {
      console.error('Error fetching application settings:', error);
      return undefined;
    }
  }
  
  /**
   * Get application settings data object
   * Retrieves just the settings JSON data from the application settings
   * 
   * @returns The application settings data or undefined if not found
   */
  async getApplicationSettingsData(): Promise<Record<string, any> | undefined> {
    try {
      const settingsRecord = await this.getApplicationSettings();
      let settings = settingsRecord?.settings;
      
      // If no settings exist, return undefined to trigger default creation
      if (!settings) {
        return undefined;
      }
      
      // Ensure templates section exists with default values
      if (!settings.templates) {
        const defaultSettings = this.getDefaultSettingsData();
        settings.templates = defaultSettings.templates;
        
        // Update the settings in the database with default admin user ID
        await this.updateApplicationSettings(1, settings);
      } else {
        // Ensure implementationTaskTemplates exists in templates
        if (!settings.templates.implementationTaskTemplates) {
          const defaultSettings = this.getDefaultSettingsData();
          settings.templates.implementationTaskTemplates = defaultSettings.templates.implementationTaskTemplates;
          
          // Update the settings in the database with default admin user ID
          await this.updateApplicationSettings(1, settings);
        }
        
        // Ensure projectRoleTemplates exists in templates
        if (!settings.templates.projectRoleTemplates) {
          const defaultSettings = this.getDefaultSettingsData();
          settings.templates.projectRoleTemplates = defaultSettings.templates.projectRoleTemplates;
          
          // Update the settings in the database with default admin user ID
          await this.updateApplicationSettings(1, settings);
        }
        
        // Ensure other template properties exist
        if (!settings.templates.defaultTaskType || !settings.templates.defaultComplexity) {
          const defaultSettings = this.getDefaultSettingsData();
          settings.templates.defaultTaskType = settings.templates.defaultTaskType || defaultSettings.templates.defaultTaskType;
          settings.templates.defaultComplexity = settings.templates.defaultComplexity || defaultSettings.templates.defaultComplexity;
          settings.templates.enableTemplateLibrary = settings.templates.enableTemplateLibrary !== undefined ? 
            settings.templates.enableTemplateLibrary : defaultSettings.templates.enableTemplateLibrary;
          
          // Update the settings in the database with default admin user ID
          await this.updateApplicationSettings(1, settings);
        }
      }
      
      return settings;
    } catch (error) {
      console.error('Error fetching application settings data:', error);
      return undefined;
    }
  }
  
  /**
   * Get application settings by category
   * Retrieves a specific category of settings from the application settings
   * 
   * @param category The settings category to retrieve (e.g., 'general', 'auth', 'notifications')
   * @returns The category settings or undefined if not found
   */
  async getApplicationSettingsByCategory(category: string): Promise<Record<string, any> | undefined> {
    try {
      const settingsData = await this.getApplicationSettingsData();
      return settingsData?.[category];
    } catch (error) {
      console.error(`Error fetching application settings for category '${category}':`, error);
      return undefined;
    }
  }
  
  /**
   * Get application setting value
   * Retrieves a specific setting value from the application settings
   * 
   * @param category The settings category (e.g., 'general', 'auth')
   * @param key The setting key within the category
   * @param defaultValue Optional default value to return if the setting is not found
   * @returns The setting value or the default value if not found
   */
  async getApplicationSettingValue<T>(category: string, key: string, defaultValue?: T): Promise<T | undefined> {
    try {
      const categorySettings = await this.getApplicationSettingsByCategory(category);
      if (!categorySettings) return defaultValue;
      
      return (categorySettings[key] as T) ?? defaultValue;
    } catch (error) {
      console.error(`Error fetching application setting '${category}.${key}':`, error);
      return defaultValue;
    }
  }
  
  /**
   * Update application settings
   * Updates the entire settings object
   * 
   * @param userId The ID of the user making the update
   * @param settingsData The new settings data to save
   * @param description Optional description for this configuration
   * @returns The updated application settings or undefined if failed
   */
  async updateApplicationSettings(
    userId: number, 
    settingsData: Record<string, any>,
    description?: string
  ): Promise<ApplicationSettings | undefined> {
    try {
      const existingSettings = await this.getApplicationSettings();
      
      if (existingSettings) {
        // Update existing settings
        const [updatedSettings] = await db.update(applicationSettings)
          .set({ 
            settings: settingsData, 
            updatedAt: new Date(),
            updatedBy: userId,
            version: existingSettings.version + 1,
            description: description || existingSettings.description
          })
          .where(eq(applicationSettings.id, existingSettings.id))
          .returning();
        
        return updatedSettings;
      } else {
        // Create new settings record if none exists
        return this.createDefaultApplicationSettings(userId, description);
      }
    } catch (error) {
      console.error('Error updating application settings:', error);
      return undefined;
    }
  }
  
  /**
   * Update application settings for a specific category
   * Updates only a specific category of settings while preserving others
   * 
   * @param userId The ID of the user making the update
   * @param category The settings category to update (e.g., 'general', 'auth')
   * @param categoryData The new category settings data
   * @returns The updated application settings or undefined if failed
   */
  async updateApplicationSettingsCategory(
    userId: number,
    category: string,
    categoryData: Record<string, any>
  ): Promise<ApplicationSettings | undefined> {
    try {
      const existingSettings = await this.getApplicationSettings();
      
      if (existingSettings) {
        // Create updated settings object with the new category data
        const updatedSettingsData = {
          ...existingSettings.settings,
          [category]: categoryData
        };
        
        // Update the settings with the new data
        return this.updateApplicationSettings(userId, updatedSettingsData);
      } else {
        // Create default settings with this category
        const defaultSettings = this.getDefaultSettingsData();
        defaultSettings[category] = categoryData;
        
        // Create new settings record
        const [newSettings] = await db.insert(applicationSettings)
          .values({
            settings: defaultSettings,
            updatedBy: userId,
            version: 1
          })
          .returning();
          
        return newSettings;
      }
    } catch (error) {
      console.error(`Error updating application settings category '${category}':`, error);
      return undefined;
    }
  }
  
  /**
   * Update a specific application setting
   * Updates a single setting value while preserving all other settings
   * 
   * @param userId The ID of the user making the update
   * @param category The settings category (e.g., 'general', 'auth')
   * @param key The setting key within the category
   * @param value The new value for the setting
   * @returns The updated application settings or undefined if failed
   */
  async updateApplicationSettingValue(
    userId: number,
    category: string,
    key: string,
    value: any
  ): Promise<ApplicationSettings | undefined> {
    try {
      const existingSettings = await this.getApplicationSettings();
      
      if (existingSettings) {
        // Get the current category data or create empty object if it doesn't exist
        const currentCategoryData = existingSettings.settings[category] || {};
        
        // Create updated category data with the new value
        const updatedCategoryData = {
          ...currentCategoryData,
          [key]: value
        };
        
        // Update the category
        return this.updateApplicationSettingsCategory(userId, category, updatedCategoryData);
      } else {
        // Create default settings with this value
        const defaultSettings = this.getDefaultSettingsData();
        
        // Ensure the category exists
        if (!defaultSettings[category]) {
          defaultSettings[category] = {};
        }
        
        // Set the value
        defaultSettings[category][key] = value;
        
        // Create new settings record
        return this.createDefaultApplicationSettings(userId, `Initial settings with ${category}.${key}`);
      }
    } catch (error) {
      console.error(`Error updating application setting '${category}.${key}':`, error);
      return undefined;
    }
  }
  
  /**
   * Get the default settings data structure
   * Used when creating the initial settings or as a fallback
   * 
   * @returns The default settings data object
   */
  getDefaultSettingsData(): Record<string, any> {
    return {
      general: {
        applicationName: "Glossa - Requirement Management",
        companyName: "Glossa AI",
        supportEmail: "support@example.com",
        maxFileUploadSize: 10485760, // 10MB
        defaultLanguage: "en",
        timeZone: "UTC"
      },
      auth: {
        passwordPolicy: {
          minLength: 8,
          requireSpecialChars: true,
          requireNumbers: true,
          requireUppercase: true,
          requireLowercase: true
        },
        mfaEnabled: false,
        sessionTimeout: 60, // 60 minutes
        allowSelfRegistration: false,
        loginAttempts: 5
      },
      notifications: {
        emailNotificationsEnabled: true,
        systemNotificationsEnabled: true,
        defaultReminderTime: 24 // 24 hours
      },
      integrations: {
        aiProvider: "google",
        aiModel: "gemini-pro",
        aiApiRateLimit: 10,
        enableThirdPartyIntegrations: true
      },
      appearance: {
        theme: "light",
        accentColor: "#4F46E5",
        cardRadius: 8,
        density: "comfortable"
      },
      security: {
        ipAllowlist: [],
        auditLogRetention: 90,
        allowConcurrentSessions: true
      },
      templates: {
        implementationTaskTemplates: [
          {
            name: "Basic Implementation",
            description: "Standard implementation task for basic features",
            estimatedHours: 4,
            complexity: "medium",
            taskType: "implementation",
            implementationSteps: ["Analyze requirements", "Design solution", "Implement code", "Test functionality"]
          },
          {
            name: "Complex Integration",
            description: "Integration task requiring multiple systems",
            estimatedHours: 8,
            complexity: "high",
            taskType: "integration",
            implementationSteps: ["Analyze integration points", "Design data flow", "Implement adapters", "Configure endpoints", "Test end-to-end flow"]
          },
          {
            name: "Bug Fix",
            description: "Task for fixing identified issues",
            estimatedHours: 2,
            complexity: "low",
            taskType: "bug-fix",
            implementationSteps: ["Reproduce issue", "Identify root cause", "Implement fix", "Verify resolution"]
          }
        ],
        projectRoleTemplates: [
          {
            id: "default-1",
            name: "Project Manager",
            roleType: "Management",
            locationType: "Onsite",
            seniorityLevel: "Senior",
            description: "Responsible for overall project coordination and delivery",
            costRate: "120",
            costUnit: "hour",
            currency: "USD",
            isActive: true
          },
          {
            id: "default-2",
            name: "Business Analyst",
            roleType: "Business",
            locationType: "Hybrid",
            seniorityLevel: "Mid",
            description: "Analyzes business needs and documents requirements",
            costRate: "95",
            costUnit: "hour",
            currency: "USD",
            isActive: true
          },
          {
            id: "default-3",
            name: "Developer",
            roleType: "Technical",
            locationType: "Remote",
            seniorityLevel: "Mid",
            description: "Implements technical solutions",
            costRate: "85",
            costUnit: "hour",
            currency: "USD",
            isActive: true
          }
        ],
        defaultTaskType: "implementation",
        defaultComplexity: "medium",
        enableTemplateLibrary: true
      }
    };
  }
  
  /**
   * Create default application settings
   * Creates the initial application settings record with default values
   * 
   * @param userId The ID of the user creating the settings
   * @param description Optional description for this configuration
   * @returns The created application settings
   */
  async createDefaultApplicationSettings(
    userId: number, 
    description?: string
  ): Promise<ApplicationSettings> {
    try {
      // Get default settings data
      const defaultSettings = this.getDefaultSettingsData();
      
      // Insert the default settings
      const [newSettings] = await db.insert(applicationSettings)
        .values({
          settings: defaultSettings,
          updatedBy: userId,
          version: 1,
          description: description || "Initial application settings"
        })
        .returning();
      
      return newSettings;
    } catch (error) {
      console.error('Error creating default application settings:', error);
      throw error;
    }
  }
}

// Always use database storage for persistence
export const storage = new DatabaseStorage();

// Log which storage system we're using
console.log(`Storage system: PostgreSQL Database`);
