/**
 * Tests for Base Service
 * 
 * These tests ensure that our base service implementation
 * correctly handles business logic and calls the repository.
 */
import { BaseService } from './base-service';
import { NotFoundError } from '../error/error-types';

// Mock repository for testing
const mockRepository = {
  findAll: jest.fn(),
  findById: jest.fn(),
  findBy: jest.fn(),
  findAllBy: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  clearCache: jest.fn(),
};

// Create a concrete service class for testing
class TestService extends BaseService {
  constructor() {
    super(mockRepository as any);
  }
  
  // Add any specific methods for testing here
  async findByName(name: string) {
    return this.repository.findBy({ name });
  }
}

describe('BaseService', () => {
  let service: TestService;
  
  beforeEach(() => {
    jest.clearAllMocks();
    service = new TestService();
  });
  
  describe('findAll', () => {
    it('should call repository.findAll and return results', async () => {
      // Arrange
      const mockEntities = [{ id: 1 }, { id: 2 }];
      mockRepository.findAll.mockResolvedValue(mockEntities);
      
      // Act
      const result = await service.findAll();
      
      // Assert
      expect(mockRepository.findAll).toHaveBeenCalled();
      expect(result).toEqual(mockEntities);
    });
  });
  
  describe('findById', () => {
    it('should call repository.findById with correct id', async () => {
      // Arrange
      const mockEntity = { id: 1, name: 'Test' };
      mockRepository.findById.mockResolvedValue(mockEntity);
      
      // Act
      const result = await service.findById(1);
      
      // Assert
      expect(mockRepository.findById).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockEntity);
    });
    
    it('should return null when entity not found', async () => {
      // Arrange
      mockRepository.findById.mockResolvedValue(null);
      
      // Act
      const result = await service.findById(999);
      
      // Assert
      expect(result).toBeNull();
    });
  });
  
  describe('getById', () => {
    it('should return entity when found', async () => {
      // Arrange
      const mockEntity = { id: 1, name: 'Test' };
      mockRepository.findById.mockResolvedValue(mockEntity);
      
      // Act
      const result = await service.getById(1);
      
      // Assert
      expect(mockRepository.findById).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockEntity);
    });
    
    it('should throw NotFoundError when entity not found', async () => {
      // Arrange
      mockRepository.findById.mockResolvedValue(null);
      
      // Act & Assert
      await expect(service.getById(999)).rejects.toThrow(NotFoundError);
      expect(mockRepository.findById).toHaveBeenCalledWith(999);
    });
    
    it('should include custom resource name in error', async () => {
      // Arrange
      mockRepository.findById.mockResolvedValue(null);
      const resourceName = 'TestEntity';
      
      // Act & Assert
      try {
        await service.getById(999, resourceName);
        fail('Should have thrown NotFoundError');
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundError);
        expect((error as NotFoundError).message).toContain(resourceName);
      }
    });
  });
  
  describe('create', () => {
    it('should call repository.create with entity data', async () => {
      // Arrange
      const newEntity = { name: 'New Entity' };
      const createdEntity = { id: 1, ...newEntity, createdAt: new Date() };
      mockRepository.create.mockResolvedValue(createdEntity);
      
      // Act
      const result = await service.create(newEntity);
      
      // Assert
      expect(mockRepository.create).toHaveBeenCalledWith(newEntity);
      expect(result).toEqual(createdEntity);
    });
    
    it('should apply pre-save hooks if provided', async () => {
      // Arrange
      const newEntity = { name: 'New Entity' };
      const transformedEntity = { name: 'NEW ENTITY' }; // Uppercase name
      const createdEntity = { id: 1, ...transformedEntity, createdAt: new Date() };
      
      // Mock pre-save hook
      const preSaveHook = jest.fn().mockReturnValue({
        ...newEntity,
        name: newEntity.name.toUpperCase(),
      });
      
      mockRepository.create.mockResolvedValue(createdEntity);
      
      // Act
      const result = await service.create(newEntity, { preSave: preSaveHook });
      
      // Assert
      expect(preSaveHook).toHaveBeenCalledWith(newEntity);
      expect(mockRepository.create).toHaveBeenCalledWith(transformedEntity);
      expect(result).toEqual(createdEntity);
    });
    
    it('should apply post-save hooks if provided', async () => {
      // Arrange
      const newEntity = { name: 'New Entity' };
      const createdEntity = { id: 1, ...newEntity, createdAt: new Date() };
      const enhancedEntity = { ...createdEntity, extraField: 'added' };
      
      // Mock post-save hook
      const postSaveHook = jest.fn().mockReturnValue({
        ...createdEntity,
        extraField: 'added',
      });
      
      mockRepository.create.mockResolvedValue(createdEntity);
      
      // Act
      const result = await service.create(newEntity, { postSave: postSaveHook });
      
      // Assert
      expect(mockRepository.create).toHaveBeenCalledWith(newEntity);
      expect(postSaveHook).toHaveBeenCalledWith(createdEntity);
      expect(result).toEqual(enhancedEntity);
    });
  });
  
  describe('update', () => {
    it('should call repository.update with id and update data', async () => {
      // Arrange
      const updateData = { name: 'Updated Entity' };
      const updatedEntity = { id: 1, ...updateData, updatedAt: new Date() };
      mockRepository.update.mockResolvedValue(updatedEntity);
      
      // Act
      const result = await service.update(1, updateData);
      
      // Assert
      expect(mockRepository.update).toHaveBeenCalledWith(1, updateData);
      expect(result).toEqual(updatedEntity);
    });
    
    it('should return null when entity to update not found', async () => {
      // Arrange
      mockRepository.update.mockResolvedValue(null);
      
      // Act
      const result = await service.update(999, { name: 'Updated' });
      
      // Assert
      expect(result).toBeNull();
    });
    
    it('should apply pre-update hooks if provided', async () => {
      // Arrange
      const updateData = { name: 'Updated Entity' };
      const transformedData = { name: 'UPDATED ENTITY' }; // Uppercase name
      const updatedEntity = { id: 1, ...transformedData, updatedAt: new Date() };
      
      // Mock pre-update hook
      const preUpdateHook = jest.fn().mockReturnValue({
        ...updateData,
        name: updateData.name.toUpperCase(),
      });
      
      mockRepository.update.mockResolvedValue(updatedEntity);
      
      // Act
      const result = await service.update(1, updateData, { preUpdate: preUpdateHook });
      
      // Assert
      expect(preUpdateHook).toHaveBeenCalledWith(updateData);
      expect(mockRepository.update).toHaveBeenCalledWith(1, transformedData);
      expect(result).toEqual(updatedEntity);
    });
    
    it('should apply post-update hooks if provided', async () => {
      // Arrange
      const updateData = { name: 'Updated Entity' };
      const updatedEntity = { id: 1, ...updateData, updatedAt: new Date() };
      const enhancedEntity = { ...updatedEntity, extraField: 'added' };
      
      // Mock post-update hook
      const postUpdateHook = jest.fn().mockReturnValue({
        ...updatedEntity,
        extraField: 'added',
      });
      
      mockRepository.update.mockResolvedValue(updatedEntity);
      
      // Act
      const result = await service.update(1, updateData, { postUpdate: postUpdateHook });
      
      // Assert
      expect(mockRepository.update).toHaveBeenCalledWith(1, updateData);
      expect(postUpdateHook).toHaveBeenCalledWith(updatedEntity);
      expect(result).toEqual(enhancedEntity);
    });
  });
  
  describe('delete', () => {
    it('should call repository.delete with id', async () => {
      // Arrange
      mockRepository.delete.mockResolvedValue(true);
      
      // Act
      const result = await service.delete(1);
      
      // Assert
      expect(mockRepository.delete).toHaveBeenCalledWith(1);
      expect(result).toBe(true);
    });
    
    it('should return false when entity to delete not found', async () => {
      // Arrange
      mockRepository.delete.mockResolvedValue(false);
      
      // Act
      const result = await service.delete(999);
      
      // Assert
      expect(result).toBe(false);
    });
    
    it('should call pre-delete hook if provided', async () => {
      // Arrange
      const preDeleteHook = jest.fn();
      mockRepository.delete.mockResolvedValue(true);
      
      // Act
      await service.delete(1, { preDelete: preDeleteHook });
      
      // Assert
      expect(preDeleteHook).toHaveBeenCalledWith(1);
      expect(mockRepository.delete).toHaveBeenCalledWith(1);
    });
    
    it('should not call repository.delete if pre-delete hook returns false', async () => {
      // Arrange
      const preDeleteHook = jest.fn().mockReturnValue(false);
      
      // Act
      const result = await service.delete(1, { preDelete: preDeleteHook });
      
      // Assert
      expect(preDeleteHook).toHaveBeenCalledWith(1);
      expect(mockRepository.delete).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });
    
    it('should call post-delete hook if provided and deletion successful', async () => {
      // Arrange
      const postDeleteHook = jest.fn();
      mockRepository.delete.mockResolvedValue(true);
      
      // Act
      await service.delete(1, { postDelete: postDeleteHook });
      
      // Assert
      expect(mockRepository.delete).toHaveBeenCalledWith(1);
      expect(postDeleteHook).toHaveBeenCalledWith(1);
    });
    
    it('should not call post-delete hook if deletion failed', async () => {
      // Arrange
      const postDeleteHook = jest.fn();
      mockRepository.delete.mockResolvedValue(false);
      
      // Act
      await service.delete(1, { postDelete: postDeleteHook });
      
      // Assert
      expect(mockRepository.delete).toHaveBeenCalledWith(1);
      expect(postDeleteHook).not.toHaveBeenCalled();
    });
  });
  
  describe('custom methods', () => {
    it('should support custom repository methods', async () => {
      // Arrange
      const mockEntity = { id: 1, name: 'Test' };
      mockRepository.findBy.mockResolvedValue(mockEntity);
      
      // Act
      const result = await service.findByName('Test');
      
      // Assert
      expect(mockRepository.findBy).toHaveBeenCalledWith({ name: 'Test' });
      expect(result).toEqual(mockEntity);
    });
  });
});