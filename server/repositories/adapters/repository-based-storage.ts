/**
 * Repository-Based Storage Adapter
 * 
 * This adapter implements the legacy IStorage interface using the new repository pattern.
 * It serves as a bridge during the migration from the monolithic storage class to
 * the repository pattern.
 */
import session from "express-session";
import connectPg from "connect-pg-simple";
import type { 
  IUserRepository,
  IProjectRepository,
  IRequirementRepository,
} from '../interfaces';
import type { IRepositoryFactory } from '../repository-factory';
import { IStorage } from '../../storage';
import { 
  User, InsertUser,
  Invite, InsertInvite,
  Project, InsertProject,
  Customer, InsertCustomer,
  InputData, InsertInputData,
  Requirement, InsertRequirement,
  Activity, InsertActivity,
  ImplementationTask, InsertImplementationTask,
  DocumentTemplate, InsertDocumentTemplate,
  Document, InsertDocument,
  FieldMapping, InsertFieldMapping,
  Workflow, InsertWorkflow, WorkflowNode, WorkflowEdge,
  RequirementComparison, InsertRequirementComparison,
  RequirementComparisonTask, InsertRequirementComparisonTask,
  ProjectRoleTemplate, InsertProjectRoleTemplate,
  ProjectRole, InsertProjectRole,
  RequirementRoleEffort, InsertRequirementRoleEffort,
  TaskRoleEffort, InsertTaskRoleEffort,
  ApplicationSettings, InsertApplicationSettings
} from '@shared/schema';
import { ExtendedImplementationTask } from '../../extended-types';

// Create PostgreSQL session store
const PostgresSessionStore = connectPg(session);

/**
 * Repository-Based Storage Adapter
 * 
 * Implements the legacy IStorage interface using repositories.
 * This adapter allows for a gradual migration to the repository pattern.
 */
export class RepositoryBasedStorage implements IStorage {
  sessionStore: session.Store;
  
  // Repository instances
  private readonly _userRepository: IUserRepository;
  private readonly _projectRepository: IProjectRepository;
  private readonly _requirementRepository: IRequirementRepository;
  // More repositories will be added as they're implemented
  
  /**
   * Creates a new RepositoryBasedStorage adapter
   * 
   * @param factory - The repository factory for getting repository instances
   */
  constructor(private readonly factory: IRepositoryFactory) {
    // Initialize session store
    this.sessionStore = new PostgresSessionStore({ 
      conObject: { 
        connectionString: process.env.DATABASE_URL 
      },
      createTableIfMissing: true 
    });
    
    // Initialize repositories
    this._userRepository = factory.getUserRepository();
    this._projectRepository = factory.getProjectRepository();
    this._requirementRepository = factory.getRequirementRepository();
    // More repositories will be initialized as they're implemented
  }
  
  //==========================================================================
  // User methods
  //==========================================================================
  
  async getUser(id: number): Promise<User | null> {
    return this._userRepository.findById(id);
  }
  
  async getUserByUsername(username: string): Promise<User | null> {
    return this._userRepository.findByUsername(username);
  }
  
  async getUserByEmail(email: string): Promise<User | null> {
    return this._userRepository.findByEmail(email);
  }
  
  async getAllUsers(): Promise<User[]> {
    return this._userRepository.findAll();
  }
  
  async createUser(user: InsertUser): Promise<User> {
    return this._userRepository.create(user);
  }
  
  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | null> {
    return this._userRepository.update(id, userData);
  }
  
  async authenticateUser(usernameOrEmail: string, password: string): Promise<User | null> {
    return this._userRepository.authenticate(usernameOrEmail, password);
  }
  
  async getUserByResetToken(token: string): Promise<User | null> {
    return this._userRepository.findByResetToken(token);
  }
  
  async saveResetToken(userId: number, token: string, expiresAt: Date): Promise<boolean> {
    return this._userRepository.saveResetToken(userId, token, expiresAt);
  }
  
  async updatePasswordAndClearToken(userId: number, hashedPassword: string): Promise<boolean> {
    return this._userRepository.updatePasswordAndClearToken(userId, hashedPassword);
  }
  
  //==========================================================================
  // Project methods
  //==========================================================================
  
  async getProject(id: number): Promise<Project | undefined> {
    const project = await this._projectRepository.findById(id);
    return project || undefined;
  }
  
  async getProjects(userId: number): Promise<Project[]> {
    return this._projectRepository.findByUserId(userId);
  }
  
  async createProject(project: InsertProject): Promise<Project> {
    return this._projectRepository.create(project);
  }
  
  async updateProject(id: number, project: Partial<InsertProject>): Promise<Project | undefined> {
    const updatedProject = await this._projectRepository.update(id, project);
    return updatedProject || undefined;
  }
  
  async deleteProject(id: number): Promise<boolean> {
    return this._projectRepository.delete(id);
  }
  
  //==========================================================================
  // Requirement methods
  //==========================================================================
  
  async getRequirement(id: number): Promise<Requirement | undefined> {
    const requirement = await this._requirementRepository.findById(id);
    return requirement || undefined;
  }
  
  async getRequirementWithProjectCheck(id: number, projectId: number): Promise<Requirement | undefined> {
    const requirement = await this._requirementRepository.verifyProjectRequirement(id, projectId);
    return requirement || undefined;
  }
  
  async getRequirementsByProject(projectId: number): Promise<Requirement[]> {
    return this._requirementRepository.findByProjectId(projectId);
  }
  
  async getRequirementsByInputData(inputDataId: number): Promise<Requirement[]> {
    return this._requirementRepository.findByInputDataId(inputDataId);
  }
  
  async createRequirement(requirement: InsertRequirement): Promise<Requirement> {
    return this._requirementRepository.create(requirement);
  }
  
  async updateRequirement(id: number, requirement: Partial<InsertRequirement>): Promise<Requirement | undefined> {
    const updatedRequirement = await this._requirementRepository.update(id, requirement);
    return updatedRequirement || undefined;
  }
  
  async deleteRequirement(id: number): Promise<boolean> {
    return this._requirementRepository.delete(id);
  }
  
  async getHighPriorityRequirements(projectId: number, limit?: number): Promise<Requirement[]> {
    return this._requirementRepository.findHighPriority(projectId, limit);
  }
  
  // Optional cache invalidation method
  invalidateRequirementCache?(id: number): void {
    // Implementation depends on how caching is handled in the repository
  }
  
  //==========================================================================
  // These methods would be implemented similarly as repositories are created
  //==========================================================================
  
  // Invite methods
  async getInvite(token: string): Promise<Invite | undefined> {
    // To be implemented when InviteRepository is available
    throw new Error('Not implemented: getInvite');
  }
  
  async getInvitesByCreator(userId: number): Promise<Invite[]> {
    // To be implemented when InviteRepository is available
    throw new Error('Not implemented: getInvitesByCreator');
  }
  
  async createInvite(invite: InsertInvite): Promise<Invite> {
    // To be implemented when InviteRepository is available
    throw new Error('Not implemented: createInvite');
  }
  
  async markInviteAsUsed(token: string): Promise<Invite | undefined> {
    // To be implemented when InviteRepository is available
    throw new Error('Not implemented: markInviteAsUsed');
  }
  
  // Customer methods
  async getCustomer(id: number): Promise<Customer | undefined> {
    // To be implemented when CustomerRepository is available
    throw new Error('Not implemented: getCustomer');
  }
  
  async getAllCustomers(): Promise<Customer[]> {
    // To be implemented when CustomerRepository is available
    throw new Error('Not implemented: getAllCustomers');
  }
  
  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    // To be implemented when CustomerRepository is available
    throw new Error('Not implemented: createCustomer');
  }
  
  async updateCustomer(id: number, customer: Partial<InsertCustomer>): Promise<Customer | undefined> {
    // To be implemented when CustomerRepository is available
    throw new Error('Not implemented: updateCustomer');
  }
  
  async deleteCustomer(id: number): Promise<boolean> {
    // To be implemented when CustomerRepository is available
    throw new Error('Not implemented: deleteCustomer');
  }
  
  // And so on for all remaining methods in the IStorage interface...
  // Each would be delegated to the appropriate repository once implemented
  
  // For brevity, implementation of the remaining methods is omitted
  // The pattern would be the same as the user, project, and requirement methods above
}