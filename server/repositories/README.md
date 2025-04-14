# Repository Pattern Implementation

This directory contains the implementation of the Repository Pattern for the application's data access layer. The pattern provides a clean separation between the domain model layer and the data access layer.

## Key Components

### Base Repository Interface (`base-repository.ts`)
Defines generic CRUD operations that all repositories should implement:
- `findById(id)`: Find an entity by its ID
- `findAll(limit?)`: Get all entities with optional limit
- `create(data)`: Create a new entity
- `update(id, data)`: Update an existing entity
- `delete(id)`: Delete an entity by ID

### Entity-Specific Repository Interfaces
- `user-repository.ts`: User-specific operations like findByUsername, authenticate
- `project-repository.ts`: Project-specific operations like findByUser, search
- `requirement-repository.ts`: Requirement operations like findByProject, findHighPriority

### Repository Implementations
Located in the `implementations` subdirectory:
- `postgres-user-repository.ts`: PostgreSQL implementation of IUserRepository
- `postgres-project-repository.ts`: PostgreSQL implementation of IProjectRepository
- `postgres-requirement-repository.ts`: PostgreSQL implementation of IRequirementRepository

### Repository Factory (`repository-factory.ts`)
Implements the Factory pattern to create and cache repository instances:
- `getUserRepository()`: Get the user repository instance
- `getProjectRepository()`: Get the project repository instance
- `getRequirementRepository()`: Get the requirement repository instance

## Design Principles

### 1. Separation of Concerns
- Repository interfaces define what operations are available
- Implementation classes handle how those operations are performed
- Factory provides a consistent way to access repositories

### 2. Dependency Inversion
- Business logic depends on repository interfaces, not concrete implementations
- This allows for easy swapping of data storage technologies without affecting business logic

### 3. Single Responsibility
- Each repository is responsible for operations on a single entity type
- Each implementation is responsible for a specific database technology

### 4. Error Handling
- Repositories handle database-specific errors internally
- They provide a consistent API regardless of the underlying database

## Usage Example

```typescript
import { repositoryFactory } from './repositories';

async function getUserProjects(username: string) {
  const userRepo = repositoryFactory.getUserRepository();
  const projectRepo = repositoryFactory.getProjectRepository();
  
  // Find the user
  const user = await userRepo.findByUsername(username);
  if (!user) {
    return [];
  }
  
  // Get their projects
  return await projectRepo.findByUser(user.id);
}
```

## Benefits of this Approach

1. **Testability**: Easy to mock repositories for unit testing
2. **Maintainability**: Clear separation of concerns
3. **Flexibility**: Ability to switch database technologies
4. **Type Safety**: Strong typing through interfaces
5. **Code Organization**: Logical grouping of related operations

## Running Examples

See the `examples` directory for example usage of repositories:

```bash
# Run the repository examples
npx tsx server/examples/run-repository-examples.ts
```