/**
 * Search Controller
 * 
 * Handles all operations related to search functionality.
 */
import { Request, Response } from 'express';
import { db } from '../db';
import { projects, requirements, implementationTasks, inputData } from '@shared/schema';
import { like, or, and, eq } from 'drizzle-orm';
import { storage } from '../storage';
import { logger } from '../utils/logger';

/**
 * Controller for search related operations
 */
export class SearchController {
  /**
   * Perform an advanced search across multiple entities
   * @param req Express request object
   * @param res Express response object
   */
  async advancedSearch(req: Request, res: Response): Promise<Response> {
    try {
      const query = String(req.query.q || '').trim();
      const projectId = req.query.projectId ? parseInt(String(req.query.projectId)) : null;
      const entityTypes = req.query.entityTypes ? String(req.query.entityTypes).split(',') : ['requirements', 'tasks', 'inputData', 'projects'];
      
      if (query.length < 2) {
        return res.status(400).json({ 
          message: "Invalid search query", 
          detail: "Search query must be at least 2 characters long" 
        });
      }

      const searchResults: any = {
        query,
        results: {
          requirements: [],
          tasks: [],
          inputData: [],
          projects: []
        }
      };

      // Add projectId to results if provided
      if (projectId) {
        searchResults.projectId = projectId;
      }
      
      const queryWithWildcards = `%${query}%`;
      
      // Search in projects
      if (entityTypes.includes('projects')) {
        let projectsQuery = db.select().from(projects).where(
          or(
            like(projects.name, queryWithWildcards),
            like(projects.description, queryWithWildcards)
          )
        );
        
        if (projectId) {
          projectsQuery = projectsQuery.where(eq(projects.id, projectId));
        }
        
        const projectResults = await projectsQuery;
        
        // Create formatted result objects for projects
        searchResults.results.projects = projectResults.map(project => ({
          id: project.id,
          name: project.name,
          description: project.description,
          entityType: 'project',
          url: `/projects/${project.id}`
        }));
      }
      
      // Search in requirements
      if (entityTypes.includes('requirements')) {
        let requirementsQuery = db.select().from(requirements).where(
          or(
            like(requirements.title, queryWithWildcards),
            like(requirements.description, queryWithWildcards)
          )
        );
        
        if (projectId) {
          requirementsQuery = requirementsQuery.where(eq(requirements.projectId, projectId));
        }
        
        const requirementResults = await requirementsQuery;
        
        // Create formatted result objects for requirements
        searchResults.results.requirements = requirementResults.map(req => ({
          id: req.id,
          title: req.title,
          description: req.description,
          projectId: req.projectId,
          category: req.category,
          priority: req.priority,
          entityType: 'requirement',
          url: `/projects/${req.projectId}/requirements/${req.id}`
        }));
      }
      
      // Search in tasks
      if (entityTypes.includes('tasks')) {
        let tasksQuery = db.select().from(implementationTasks).where(
          or(
            like(implementationTasks.title, queryWithWildcards),
            like(implementationTasks.description, queryWithWildcards)
          )
        );
        
        // To filter by projectId for tasks, we need to join with requirements
        if (projectId) {
          tasksQuery = db.select().from(implementationTasks)
            .innerJoin(requirements, eq(implementationTasks.requirementId, requirements.id))
            .where(
              and(
                eq(requirements.projectId, projectId),
                or(
                  like(implementationTasks.title, queryWithWildcards),
                  like(implementationTasks.description, queryWithWildcards)
                )
              )
            );
        }
        
        const taskResults = await tasksQuery;
        
        // For tasks, we need to get the associated requirements to determine the projectId
        const requirementIds = new Set();
        taskResults.forEach(task => {
          requirementIds.add(task.requirementId);
        });
        
        let requirementMap = new Map();
        
        // Only fetch requirements if we have tasks
        if (requirementIds.size > 0) {
          const requirementsList = await db.select().from(requirements).where(
            inArray(requirements.id, Array.from(requirementIds))
          );
          
          requirementsList.forEach(req => {
            requirementMap.set(req.id, req);
          });
        }
        
        // Create formatted result objects for tasks
        searchResults.results.tasks = taskResults.map(task => {
          const relatedRequirement = requirementMap.get(task.requirementId);
          return {
            id: task.id,
            title: task.title,
            description: task.description,
            requirementId: task.requirementId,
            status: task.status,
            priority: task.priority,
            projectId: relatedRequirement ? relatedRequirement.projectId : null,
            entityType: 'task',
            url: `/tasks/${task.id}`
          };
        });
      }
      
      // Search in input data
      if (entityTypes.includes('inputData')) {
        let inputDataQuery = db.select().from(inputData).where(
          or(
            like(inputData.name, queryWithWildcards),
            like(inputData.summary, queryWithWildcards)
          )
        );
        
        if (projectId) {
          inputDataQuery = inputDataQuery.where(eq(inputData.projectId, projectId));
        }
        
        const inputDataResults = await inputDataQuery;
        
        // Create formatted result objects for input data
        searchResults.results.inputData = inputDataResults.map(data => ({
          id: data.id,
          name: data.name,
          summary: data.summary,
          projectId: data.projectId,
          type: data.type,
          format: data.format,
          entityType: 'inputData',
          url: `/projects/${data.projectId}/input-data/${data.id}`
        }));
      }
      
      // Calculate total results count
      const totalResults = 
        searchResults.results.requirements.length +
        searchResults.results.tasks.length +
        searchResults.results.inputData.length +
        searchResults.results.projects.length;
      
      searchResults.totalResults = totalResults;
      
      return res.json(searchResults);
    } catch (error) {
      logger.error("Error performing advanced search:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }
}

import { inArray } from 'drizzle-orm';
export const searchController = new SearchController();