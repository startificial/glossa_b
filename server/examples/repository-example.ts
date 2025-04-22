/**
 * Repository Pattern Usage Example
 * 
 * This file demonstrates how to use the repository pattern with the factory.
 * It provides usage examples for common operations with different entity repositories.
 */
import { repositoryFactory } from '../repositories';

// Example: Using the User Repository
async function userRepositoryExample() {
  // Get the user repository from the factory (handles async)
  const userRepository = await repositoryFactory.getUserRepository();
  
  try {
    // Find a user by ID
    const user = await userRepository.findById(1);
    console.log('User found:', user);
    
    // Import centralized demo user configuration
    const { DEMO_USER_CONFIG } = await import('@shared/config');
    
    // Find a user by username using configured value
    const userByUsername = await userRepository.findByUsername(DEMO_USER_CONFIG.USERNAME);
    console.log('User by username:', userByUsername);
    
    // Find all users
    const allUsers = await userRepository.findAll();
    console.log(`Found ${allUsers.length} users`);
    
    // The implementation handles error management internally
  } catch (error) {
    console.error('An unexpected error occurred:', error);
  }
}

// Example: Using the Project Repository
async function projectRepositoryExample() {
  // Get the project repository from the factory
  const projectRepository = repositoryFactory.getProjectRepository();
  
  try {
    // Find projects by user
    const userProjects = await projectRepository.findByUser(1);
    console.log(`User has ${userProjects.length} projects`);
    
    // Search for projects
    const searchResults = await projectRepository.search('migration');
    console.log(`Found ${searchResults.length} projects matching 'migration'`);
    
    // Get recent projects
    const recentProjects = await projectRepository.findRecent(5);
    console.log('Recent projects:', recentProjects.map(p => p.name));
  } catch (error) {
    console.error('An unexpected error occurred:', error);
  }
}

// Example: Using the Requirement Repository
async function requirementRepositoryExample() {
  // Get the requirement repository from the factory
  const requirementRepository = repositoryFactory.getRequirementRepository();
  
  try {
    // Find requirements for a project
    const projectRequirements = await requirementRepository.findByProject(1);
    console.log(`Project has ${projectRequirements.length} requirements`);
    
    // Find high priority requirements
    const highPriorityRequirements = await requirementRepository.findHighPriority(1);
    console.log(`Project has ${highPriorityRequirements.length} high priority requirements`);
    
    // Check if a requirement title exists
    const exists = await requirementRepository.existsByTitle(1, 'Login Authentication');
    console.log('Requirement exists:', exists);
  } catch (error) {
    console.error('An unexpected error occurred:', error);
  }
}

// Example: Combined repository usage
async function combinedRepositoryExample() {
  const userRepository = await repositoryFactory.getUserRepository();
  const projectRepository = repositoryFactory.getProjectRepository();
  const requirementRepository = repositoryFactory.getRequirementRepository();
  
  try {
    // Import centralized demo user configuration
    const { DEMO_USER_CONFIG } = await import('@shared/config');
    
    // Get a user using configured username
    const user = await userRepository.findByUsername(DEMO_USER_CONFIG.USERNAME);
    if (!user) {
      console.log(`User ${DEMO_USER_CONFIG.USERNAME} not found`);
      return;
    }
    
    // Get their projects
    const projects = await projectRepository.findByUser(user.id);
    console.log(`User ${user.username} has ${projects.length} projects`);
    
    // For each project, get the requirements
    for (const project of projects.slice(0, 3)) { // Limit to first 3 projects
      const requirements = await requirementRepository.findByProject(project.id);
      console.log(`Project '${project.name}' has ${requirements.length} requirements`);
    }
  } catch (error) {
    console.error('An unexpected error occurred:', error);
  }
}

// Export examples for potential use
export {
  userRepositoryExample,
  projectRepositoryExample,
  requirementRepositoryExample,
  combinedRepositoryExample
};