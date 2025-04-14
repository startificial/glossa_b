/**
 * Tests for Base Repository
 * 
 * These tests ensure that our base repository implementation
 * correctly handles database operations with proper caching.
 */
import { BaseRepository } from './base-repository';
import { DatabaseError } from '../error/error-types';

// Create a mock database client
const mockDb = {
  select: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

// Create a mock table schema
const mockTable = {
  name: 'test_table',
};

// Create a mock cache service
const mockCacheService = {
  get: jest.fn(),
  set: jest.fn(),
  delete: jest.fn(),
  clear: jest.fn(),
  has: jest.fn(),
};

// Define interface for our test entity
interface TestEntity {
  id: number;
  name: string;
  createdAt: Date;
}

// Create a specialized test repository
class TestRepository extends BaseRepository<TestEntity> {
  constructor(db: any, cacheService: any) {
    super(db, mockTable as any, 'test_table', cacheService);
  }
  
  // Add any specific methods for testing here
  async findByName(name: string): Promise<TestEntity | null> {
    return this.findBy({ name });
  }
}

describe('BaseRepository', () => {
  let repository: TestRepository;
  
  // Setup repository before each test
  beforeEach(() => {
    jest.clearAllMocks();
    repository = new TestRepository(mockDb, mockCacheService);
  });
  
  describe('findAll', () => {
    it('should return all entities and cache the results', async () => {
      // Arrange
      const mockEntities = [
        { id: 1, name: 'Test 1', createdAt: new Date() },
        { id: 2, name: 'Test 2', createdAt: new Date() },
      ];
      mockDb.select.mockResolvedValue(mockEntities);
      mockCacheService.get.mockReturnValue(null); // Cache miss
      
      // Act
      const result = await repository.findAll();
      
      // Assert
      expect(result).toEqual(mockEntities);
      expect(mockDb.select).toHaveBeenCalledTimes(1);
      expect(mockCacheService.set).toHaveBeenCalledWith(
        'test_table:all',
        mockEntities,
        expect.any(Number)
      );
    });
    
    it('should return cached results if available', async () => {
      // Arrange
      const cachedEntities = [
        { id: 1, name: 'Cached 1', createdAt: new Date() },
        { id: 2, name: 'Cached 2', createdAt: new Date() },
      ];
      mockCacheService.get.mockReturnValue(cachedEntities); // Cache hit
      
      // Act
      const result = await repository.findAll();
      
      // Assert
      expect(result).toEqual(cachedEntities);
      expect(mockDb.select).not.toHaveBeenCalled(); // Should not hit DB
    });
    
    it('should handle empty results', async () => {
      // Arrange
      mockDb.select.mockResolvedValue([]);
      mockCacheService.get.mockReturnValue(null); // Cache miss
      
      // Act
      const result = await repository.findAll();
      
      // Assert
      expect(result).toEqual([]);
      expect(mockCacheService.set).toHaveBeenCalledWith(
        'test_table:all',
        [],
        expect.any(Number)
      );
    });
    
    it('should throw DatabaseError on database failure', async () => {
      // Arrange
      mockDb.select.mockRejectedValue(new Error('Database connection lost'));
      mockCacheService.get.mockReturnValue(null); // Cache miss
      
      // Act & Assert
      await expect(repository.findAll()).rejects.toThrow(DatabaseError);
      await expect(repository.findAll()).rejects.toThrow('Database operation \'select\' failed');
    });
  });
  
  describe('findById', () => {
    it('should return entity by id from cache if available', async () => {
      // Arrange
      const cachedEntity = { id: 1, name: 'Cached Entity', createdAt: new Date() };
      mockCacheService.get.mockReturnValue(cachedEntity); // Cache hit
      
      // Act
      const result = await repository.findById(1);
      
      // Assert
      expect(result).toEqual(cachedEntity);
      expect(mockDb.select).not.toHaveBeenCalled(); // Should not hit DB
    });
    
    it('should query database and cache result on cache miss', async () => {
      // Arrange
      const mockEntity = { id: 1, name: 'Test Entity', createdAt: new Date() };
      mockCacheService.get.mockReturnValue(null); // Cache miss
      mockDb.select.mockResolvedValue([mockEntity]);
      
      // Act
      const result = await repository.findById(1);
      
      // Assert
      expect(result).toEqual(mockEntity);
      expect(mockDb.select).toHaveBeenCalledTimes(1);
      expect(mockCacheService.set).toHaveBeenCalledWith(
        'test_table:1',
        mockEntity,
        expect.any(Number)
      );
    });
    
    it('should return null when entity not found', async () => {
      // Arrange
      mockCacheService.get.mockReturnValue(null); // Cache miss
      mockDb.select.mockResolvedValue([]); // Empty result from DB
      
      // Act
      const result = await repository.findById(999);
      
      // Assert
      expect(result).toBeNull();
      expect(mockCacheService.set).not.toHaveBeenCalled(); // Don't cache null results
    });
  });
  
  describe('create', () => {
    it('should insert entity and update cache', async () => {
      // Arrange
      const newEntity = { name: 'New Entity' };
      const createdEntity = { id: 1, name: 'New Entity', createdAt: new Date() };
      mockDb.insert.mockResolvedValue([createdEntity]);
      
      // Act
      const result = await repository.create(newEntity as Partial<TestEntity>);
      
      // Assert
      expect(result).toEqual(createdEntity);
      expect(mockDb.insert).toHaveBeenCalledWith(
        mockTable,
        expect.objectContaining(newEntity)
      );
      expect(mockCacheService.delete).toHaveBeenCalledWith('test_table:all'); // Invalidate list cache
      expect(mockCacheService.set).toHaveBeenCalledWith(
        'test_table:1',
        createdEntity,
        expect.any(Number)
      );
    });
    
    it('should throw DatabaseError on insert failure', async () => {
      // Arrange
      const newEntity = { name: 'New Entity' };
      mockDb.insert.mockRejectedValue(new Error('Insert failed'));
      
      // Act & Assert
      await expect(repository.create(newEntity as Partial<TestEntity>)).rejects.toThrow(DatabaseError);
      await expect(repository.create(newEntity as Partial<TestEntity>)).rejects.toThrow('Database operation \'insert\' failed');
    });
  });
  
  describe('update', () => {
    it('should update entity and refresh cache', async () => {
      // Arrange
      const id = 1;
      const updateData = { name: 'Updated Name' };
      const updatedEntity = { id: 1, name: 'Updated Name', createdAt: new Date() };
      mockDb.update.mockResolvedValue([updatedEntity]);
      
      // Act
      const result = await repository.update(id, updateData);
      
      // Assert
      expect(result).toEqual(updatedEntity);
      expect(mockDb.update).toHaveBeenCalledWith(
        mockTable,
        expect.objectContaining(updateData),
        expect.any(Object) // Where clause
      );
      expect(mockCacheService.delete).toHaveBeenCalledWith('test_table:all'); // Invalidate list cache
      expect(mockCacheService.delete).toHaveBeenCalledWith(`test_table:${id}`); // Invalidate entity cache
      expect(mockCacheService.set).toHaveBeenCalledWith(
        `test_table:${id}`,
        updatedEntity,
        expect.any(Number)
      );
    });
    
    it('should return null when entity to update not found', async () => {
      // Arrange
      const id = 999;
      const updateData = { name: 'Updated Name' };
      mockDb.update.mockResolvedValue([]); // No rows updated
      
      // Act
      const result = await repository.update(id, updateData);
      
      // Assert
      expect(result).toBeNull();
    });
    
    it('should throw DatabaseError on update failure', async () => {
      // Arrange
      const id = 1;
      const updateData = { name: 'Updated Name' };
      mockDb.update.mockRejectedValue(new Error('Update failed'));
      
      // Act & Assert
      await expect(repository.update(id, updateData)).rejects.toThrow(DatabaseError);
      await expect(repository.update(id, updateData)).rejects.toThrow('Database operation \'update\' failed');
    });
  });
  
  describe('delete', () => {
    it('should delete entity and clear cache', async () => {
      // Arrange
      const id = 1;
      mockDb.delete.mockResolvedValue(1); // 1 row affected
      
      // Act
      const result = await repository.delete(id);
      
      // Assert
      expect(result).toBe(true);
      expect(mockDb.delete).toHaveBeenCalledWith(
        mockTable,
        expect.objectContaining({ id })
      );
      expect(mockCacheService.delete).toHaveBeenCalledWith('test_table:all'); // Invalidate list cache
      expect(mockCacheService.delete).toHaveBeenCalledWith(`test_table:${id}`); // Invalidate entity cache
    });
    
    it('should return false when entity to delete not found', async () => {
      // Arrange
      const id = 999;
      mockDb.delete.mockResolvedValue(0); // No rows affected
      
      // Act
      const result = await repository.delete(id);
      
      // Assert
      expect(result).toBe(false);
    });
    
    it('should throw DatabaseError on delete failure', async () => {
      // Arrange
      const id = 1;
      mockDb.delete.mockRejectedValue(new Error('Delete failed'));
      
      // Act & Assert
      await expect(repository.delete(id)).rejects.toThrow(DatabaseError);
      await expect(repository.delete(id)).rejects.toThrow('Database operation \'delete\' failed');
    });
  });
  
  describe('findBy', () => {
    it('should find entities by specified criteria', async () => {
      // Arrange
      const criteria = { name: 'Test Entity' };
      const mockEntities = [
        { id: 1, name: 'Test Entity', createdAt: new Date() },
        { id: 2, name: 'Test Entity', createdAt: new Date() },
      ];
      mockDb.select.mockResolvedValue(mockEntities);
      
      // Act
      const result = await repository.findBy(criteria);
      
      // Assert
      expect(result).toEqual(mockEntities[0]); // Should return first match
      expect(mockDb.select).toHaveBeenCalledWith(mockTable, expect.objectContaining(criteria));
    });
    
    it('should return null when no entities match criteria', async () => {
      // Arrange
      const criteria = { name: 'Non-existent' };
      mockDb.select.mockResolvedValue([]);
      
      // Act
      const result = await repository.findBy(criteria);
      
      // Assert
      expect(result).toBeNull();
    });
  });
  
  describe('findAllBy', () => {
    it('should find all entities matching criteria', async () => {
      // Arrange
      const criteria = { active: true };
      const mockEntities = [
        { id: 1, name: 'Active 1', active: true, createdAt: new Date() },
        { id: 2, name: 'Active 2', active: true, createdAt: new Date() },
      ];
      mockDb.select.mockResolvedValue(mockEntities);
      
      // Act
      const result = await repository.findAllBy(criteria);
      
      // Assert
      expect(result).toEqual(mockEntities);
      expect(mockDb.select).toHaveBeenCalledWith(mockTable, expect.objectContaining(criteria));
    });
    
    it('should return empty array when no entities match criteria', async () => {
      // Arrange
      const criteria = { active: false };
      mockDb.select.mockResolvedValue([]);
      
      // Act
      const result = await repository.findAllBy(criteria);
      
      // Assert
      expect(result).toEqual([]);
    });
  });
  
  describe('clearCache', () => {
    it('should clear all cache entries for this repository', async () => {
      // Act
      await repository.clearCache();
      
      // Assert
      expect(mockCacheService.clear).toHaveBeenCalledWith('test_table:');
    });
  });
});