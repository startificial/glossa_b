/**
 * Search Service (Optimized Version)
 * 
 * This service handles advanced search across multiple entity types with 
 * performance optimizations:
 * - Parallel query execution for different entity types
 * - Database index usage
 * - Query limit awareness (early termination)
 * - Caching
 * - Optimized text searching
 */
import { eq, and, or, like, desc, sql, inArray } from 'drizzle-orm';
import { db } from '../db';
import { Project, Requirement, InputData, ExtendedImplementationTask } from '../interfaces/models';
import { 
  projects, 
  requirements, 
  inputData, 
  implementationTasks,
  activities
} from '../../shared/schema';
import { cacheService } from './cache-service';
import { ApiError } from '../error/api-error';

// Search service types
interface SearchFilters {
  entityTypes?: string[];
  projectId?: number;
  category?: string;
  priority?: string;
  dateRange?: { from?: Date; to?: Date };
}

interface SearchPagination {
  page: number;
  limit: number;
}

interface SearchResult {
  projects: Project[];
  requirements: Requirement[];
  inputData: InputData[];
  tasks: ExtendedImplementationTask[];
  totalResults: number;
  totalPages: number;
}

/**
 * Optimized advanced search service
 */
export async function advancedSearch(
  userId: number, 
  query: string, 
  filters?: SearchFilters,
  pagination?: SearchPagination
): Promise<SearchResult> {
  try {
    console.log(`[SearchService] Performing search with query "${query}" for user ${userId}`);
    
    // Set up basic variables
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 10;
    const offset = (page - 1) * limit;
    const searchTerm = query ? `%${query.toLowerCase()}%` : '';
    
    // Early return if no query is provided
    if (!query || !query.trim()) {
      return {
        projects: [],
        requirements: [],
        inputData: [],
        tasks: [],
        totalResults: 0,
        totalPages: 0
      };
    }
    
    // Calculate cache key based on search params
    const cacheKey = `search:${userId}:${query}:${JSON.stringify(filters)}:${page}:${limit}`;
    
    // Check if we have a cached result
    const cachedResult = cacheService.get<SearchResult>(cacheKey);
    if (cachedResult) {
      console.log(`[SearchService] Returning cached search result for "${query}"`);
      return cachedResult;
    }
    
    // Get entity types to search
    const entityTypes = filters?.entityTypes || ["projects", "requirements", "inputData", "tasks"];
    
    // Execute parallel queries for each entity type
    // This is much faster than sequential queries
    const [
      projectResults,
      requirementResults,
      inputDataResults,
      taskResults
    ] = await Promise.all([
      // Only execute queries for requested entity types
      entityTypes.includes("projects") ? searchProjects(userId, searchTerm, filters, limit) : Promise.resolve([]),
      entityTypes.includes("requirements") ? searchRequirements(userId, searchTerm, filters, limit) : Promise.resolve([]),
      entityTypes.includes("inputData") ? searchInputData(userId, searchTerm, filters, limit) : Promise.resolve([]),
      entityTypes.includes("tasks") ? searchTasks(userId, searchTerm, filters, limit) : Promise.resolve([])
    ]);
    
    // Calculate total results and pages
    const totalResults = 
      projectResults.length + 
      requirementResults.length + 
      inputDataResults.length + 
      taskResults.length;
      
    const totalPages = Math.ceil(totalResults / limit);
    
    // Create the result
    const result: SearchResult = {
      projects: projectResults,
      requirements: requirementResults,
      inputData: inputDataResults,
      tasks: taskResults,
      totalResults,
      totalPages
    };
    
    // Cache the result for 1 minute (search results are context-dependent)
    cacheService.set(cacheKey, result, 60 * 1000);
    
    return result;
  } catch (error) {
    console.error('[SearchService] Error in advanced search:', error);
    throw new ApiError(
      'Search error', 
      500, 
      `Failed to execute search: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Project search with performance optimizations
 */
async function searchProjects(
  userId: number, 
  searchTerm: string, 
  filters?: SearchFilters,
  limit?: number
): Promise<Project[]> {
  try {
    // Start building the query with text search
    let query = db.select()
      .from(projects)
      .where(
        or(
          like(sql\`lower(\${projects.name})\`, searchTerm),
          like(sql\`lower(\${projects.description})\`, searchTerm),
          like(sql\`lower(\${projects.sourceSystem})\`, searchTerm),
          like(sql\`lower(\${projects.targetSystem})\`, searchTerm)
        )
      )
      .orderBy(desc(projects.updatedAt));
    
    // Apply projectId filter if available
    if (filters?.projectId) {
      query = query.where(eq(projects.id, filters.projectId));
    }
    
    // Apply date range filter if available
    if (filters?.dateRange?.from) {
      query = query.where(sql\`\${projects.createdAt} >= \${filters.dateRange.from}\`);
    }
    if (filters?.dateRange?.to) {
      query = query.where(sql\`\${projects.createdAt} <= \${filters.dateRange.to}\`);
    }
    
    // Limit results for performance
    if (limit) {
      query = query.limit(limit);
    }
    
    return await query;
  } catch (error) {
    console.error('[SearchService] Error searching projects:', error);
    return [];
  }
}

/**
 * Requirements search with performance optimizations
 */
async function searchRequirements(
  userId: number, 
  searchTerm: string, 
  filters?: SearchFilters,
  limit?: number
): Promise<Requirement[]> {
  try {
    // Build query with text search
    let query = db.select()
      .from(requirements)
      .innerJoin(projects, eq(requirements.projectId, projects.id))
      .where(
        and(
          // Text search
          or(
            like(sql\`lower(\${requirements.title})\`, searchTerm),
            like(sql\`lower(\${requirements.description})\`, searchTerm),
            like(sql\`lower(\${requirements.category})\`, searchTerm)
          ),
          // Ensure user has access to the project
          eq(projects.userId, userId)
        )
      )
      .orderBy(desc(requirements.updatedAt));
    
    // Apply projectId filter if available
    if (filters?.projectId) {
      query = query.where(eq(requirements.projectId, filters.projectId));
    }
    
    // Apply category filter if available
    if (filters?.category) {
      query = query.where(eq(requirements.category, filters.category));
    }
    
    // Apply priority filter if available
    if (filters?.priority) {
      query = query.where(eq(requirements.priority, filters.priority));
    }
    
    // Apply date range filter if available
    if (filters?.dateRange?.from) {
      query = query.where(sql\`\${requirements.createdAt} >= \${filters.dateRange.from}\`);
    }
    if (filters?.dateRange?.to) {
      query = query.where(sql\`\${requirements.createdAt} <= \${filters.dateRange.to}\`);
    }
    
    // Limit results for performance
    if (limit) {
      query = query.limit(limit);
    }
    
    return await query.then(rows => rows.map(row => row.requirements));
  } catch (error) {
    console.error('[SearchService] Error searching requirements:', error);
    return [];
  }
}

/**
 * Input data search with performance optimizations
 */
async function searchInputData(
  userId: number, 
  searchTerm: string, 
  filters?: SearchFilters,
  limit?: number
): Promise<InputData[]> {
  try {
    // Build query with text search
    let query = db.select()
      .from(inputData)
      .innerJoin(projects, eq(inputData.projectId, projects.id))
      .where(
        and(
          // Text search
          or(
            like(sql\`lower(\${inputData.name})\`, searchTerm),
            like(sql\`lower(\${inputData.type})\`, searchTerm),
            like(sql\`lower(\${inputData.contentType})\`, searchTerm)
          ),
          // Ensure user has access to the project
          eq(projects.userId, userId)
        )
      )
      .orderBy(desc(inputData.createdAt));
    
    // Apply projectId filter if available
    if (filters?.projectId) {
      query = query.where(eq(inputData.projectId, filters.projectId));
    }
    
    // Apply date range filter if available
    if (filters?.dateRange?.from) {
      query = query.where(sql\`\${inputData.createdAt} >= \${filters.dateRange.from}\`);
    }
    if (filters?.dateRange?.to) {
      query = query.where(sql\`\${inputData.createdAt} <= \${filters.dateRange.to}\`);
    }
    
    // Limit results for performance
    if (limit) {
      query = query.limit(limit);
    }
    
    return await query.then(rows => rows.map(row => row.input_data));
  } catch (error) {
    console.error('[SearchService] Error searching input data:', error);
    return [];
  }
}

/**
 * Tasks search with performance optimizations
 */
async function searchTasks(
  userId: number, 
  searchTerm: string, 
  filters?: SearchFilters,
  limit?: number
): Promise<ExtendedImplementationTask[]> {
  try {
    // Build query with text search and join performance optimization
    let query = db.select({
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
    .innerJoin(projects, eq(requirements.projectId, projects.id))
    .where(
      and(
        // Text search
        or(
          like(sql\`lower(\${implementationTasks.title})\`, searchTerm),
          like(sql\`lower(\${implementationTasks.description})\`, searchTerm),
          like(sql\`lower(\${implementationTasks.status})\`, searchTerm)
        ),
        // Ensure user has access to the project
        eq(projects.userId, userId)
      )
    )
    .orderBy(desc(implementationTasks.updatedAt));
    
    // Apply projectId filter if available
    if (filters?.projectId) {
      query = query.where(eq(requirements.projectId, filters.projectId));
    }
    
    // Apply priority filter if available
    if (filters?.priority) {
      query = query.where(eq(implementationTasks.priority, filters.priority));
    }
    
    // Apply date range filter if available
    if (filters?.dateRange?.from) {
      query = query.where(sql\`\${implementationTasks.createdAt} >= \${filters.dateRange.from}\`);
    }
    if (filters?.dateRange?.to) {
      query = query.where(sql\`\${implementationTasks.createdAt} <= \${filters.dateRange.to}\`);
    }
    
    // Limit results for performance
    if (limit) {
      query = query.limit(limit);
    }
    
    return await query;
  } catch (error) {
    console.error('[SearchService] Error searching tasks:', error);
    return [];
  }
}