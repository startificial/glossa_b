# Migration Plan: DatabaseStorage to Repository Pattern

This document outlines the step-by-step process for migrating from the current monolithic `DatabaseStorage` class to the new Repository Pattern architecture.

## Phase 1: Preparation (Complete)

- ✅ Create repository interfaces
- ✅ Implement PostgreSQL repositories
- ✅ Create repository factory
- ✅ Prepare example usage code

## Phase 2: Gradual Migration (Next Steps)

### Step 1: Implement Database Storage Wrapper

Create a transition class that implements the `IStorage` interface but uses repositories internally:

```typescript
export class RepositoryBasedStorage implements IStorage {
  private userRepository: IUserRepository;
  private projectRepository: IProjectRepository;
  private requirementRepository: IRequirementRepository;
  // More repositories as needed
  
  constructor(private factory: IRepositoryFactory) {
    this.userRepository = factory.getUserRepository();
    this.projectRepository = factory.getProjectRepository();
    this.requirementRepository = factory.getRequirementRepository();
    // Initialize other repositories
  }
  
  // Implement all IStorage methods using repositories
  async getUser(id: number): Promise<User | undefined> {
    return this.userRepository.findById(id);
  }
  
  // Continue implementing all methods...
}
```

### Step 2: Test The Transition Class

Create tests to verify that the `RepositoryBasedStorage` implementation behaves identically to the current `DatabaseStorage` implementation.

### Step 3: Switch Storage Implementation

Modify the storage export in `storage.ts`:

```typescript
// From:
export const storage = new DatabaseStorage();

// To:
export const storage = new RepositoryBasedStorage(repositoryFactory);
```

### Step 4: Identify Routes That Use Storage Directly

Analyze all routes to find those that access `storage` directly and make a plan to update them.

## Phase 3: Full Migration (Long-Term Plan)

### Step 1: Update Route Handlers

Refactor route handlers to use repositories directly, instead of the storage interface:

```typescript
// Before:
app.get('/api/users/:id', async (req, res) => {
  const user = await storage.getUser(parseInt(req.params.id));
  // ...
});

// After:
app.get('/api/users/:id', async (req, res) => {
  const userRepository = repositoryFactory.getUserRepository();
  const user = await userRepository.findById(parseInt(req.params.id));
  // ...
});
```

### Step 2: Create Service Layer (Optional)

Consider adding a service layer between routes and repositories for complex business logic:

```typescript
class UserService {
  constructor(private userRepository: IUserRepository) {}
  
  async getUserWithProjects(userId: number) {
    const user = await this.userRepository.findById(userId);
    // Additional business logic...
    return user;
  }
}
```

### Step 3: Remove DatabaseStorage

Once all code is migrated to use repositories:
1. Remove the `DatabaseStorage` class
2. Remove the `IStorage` interface 
3. Update any remaining code that depends on them

## Phase 4: Repository Pattern Extension

### Step 1: Add More Entity Repositories

Create repositories for remaining entities:
- Activity repository
- InputData repository
- Document repository
- Customer repository
- Invite repository
- Task repository

### Step 2: Add Advanced Features to Repositories

Enhance repositories with:
- Caching support
- Pagination
- Filtering
- Transaction support
- Batch operations

## Migration Principles

### 1. Incremental Changes
Make small, testable changes rather than replacing everything at once.

### 2. Backward Compatibility
Ensure that the application continues to function throughout the migration.

### 3. Testing
Test each change thoroughly to minimize the risk of introducing bugs.

### 4. Documentation
Document all changes and update existing documentation as needed.

### 5. Training
Provide examples and guidance for team members on how to use the new pattern.

## Success Criteria

The migration will be considered successful when:

1. All database access is done through repositories
2. No code references the `DatabaseStorage` class directly
3. Application functionality is fully preserved
4. Code is more maintainable and testable
5. All tests pass