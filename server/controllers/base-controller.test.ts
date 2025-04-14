/**
 * Tests for Base Controller
 * 
 * These tests ensure that our base controller implementation
 * correctly handles requests and responses.
 */
import { BaseController } from './base-controller';
import { 
  ValidationError, 
  NotFoundError 
} from '../error/error-types';
import {
  createMockRequest,
  createMockResponse,
  createMockNext
} from '../__tests__/test-utils';

// Mock service for testing
const mockService = {
  findAll: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

// Create a concrete controller class for testing
class TestController extends BaseController {
  constructor() {
    super(mockService as any);
  }
  
  // Add any specific methods for testing here
  async customAction(req: any, res: any, next: any) {
    try {
      const result = { custom: true };
      return this.sendResponse(res, result);
    } catch (error) {
      return next(error);
    }
  }
}

describe('BaseController', () => {
  let controller: TestController;
  
  beforeEach(() => {
    jest.clearAllMocks();
    controller = new TestController();
  });
  
  describe('getAll', () => {
    it('should return all entities from service', async () => {
      // Arrange
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();
      const mockEntities = [{ id: 1 }, { id: 2 }];
      mockService.findAll.mockResolvedValue(mockEntities);
      
      // Act
      await controller.getAll(req, res, next);
      
      // Assert
      expect(mockService.findAll).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(mockEntities);
      expect(res.status).toHaveBeenCalledWith(200);
    });
    
    it('should call next with error if service throws', async () => {
      // Arrange
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();
      const error = new Error('Service error');
      mockService.findAll.mockRejectedValue(error);
      
      // Act
      await controller.getAll(req, res, next);
      
      // Assert
      expect(next).toHaveBeenCalledWith(error);
      expect(res.json).not.toHaveBeenCalled();
    });
  });
  
  describe('getById', () => {
    it('should return entity by id from service', async () => {
      // Arrange
      const req = createMockRequest({
        params: { id: '1' }
      });
      const res = createMockResponse();
      const next = createMockNext();
      const mockEntity = { id: 1, name: 'Test Entity' };
      mockService.findById.mockResolvedValue(mockEntity);
      
      // Act
      await controller.getById(req, res, next);
      
      // Assert
      expect(mockService.findById).toHaveBeenCalledWith(1);
      expect(res.json).toHaveBeenCalledWith(mockEntity);
      expect(res.status).toHaveBeenCalledWith(200);
    });
    
    it('should return 404 if entity not found', async () => {
      // Arrange
      const req = createMockRequest({
        params: { id: '999' }
      });
      const res = createMockResponse();
      const next = createMockNext();
      mockService.findById.mockResolvedValue(null);
      
      // Act
      await controller.getById(req, res, next);
      
      // Assert
      expect(next).toHaveBeenCalledWith(expect.any(NotFoundError));
    });
    
    it('should validate id parameter', async () => {
      // Arrange
      const req = createMockRequest({
        params: { id: 'not-a-number' }
      });
      const res = createMockResponse();
      const next = createMockNext();
      
      // Act
      await controller.getById(req, res, next);
      
      // Assert
      expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
      expect(mockService.findById).not.toHaveBeenCalled();
    });
  });
  
  describe('create', () => {
    it('should create entity using service', async () => {
      // Arrange
      const newEntity = { name: 'New Entity' };
      const req = createMockRequest({
        body: newEntity
      });
      const res = createMockResponse();
      const next = createMockNext();
      const createdEntity = { id: 1, ...newEntity, createdAt: new Date() };
      mockService.create.mockResolvedValue(createdEntity);
      
      // Act
      await controller.create(req, res, next);
      
      // Assert
      expect(mockService.create).toHaveBeenCalledWith(newEntity);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(createdEntity);
    });
    
    it('should call next with error if service throws', async () => {
      // Arrange
      const req = createMockRequest({
        body: { name: 'New Entity' }
      });
      const res = createMockResponse();
      const next = createMockNext();
      const error = new Error('Service error');
      mockService.create.mockRejectedValue(error);
      
      // Act
      await controller.create(req, res, next);
      
      // Assert
      expect(next).toHaveBeenCalledWith(error);
    });
  });
  
  describe('update', () => {
    it('should update entity using service', async () => {
      // Arrange
      const updateData = { name: 'Updated Entity' };
      const req = createMockRequest({
        params: { id: '1' },
        body: updateData
      });
      const res = createMockResponse();
      const next = createMockNext();
      const updatedEntity = { id: 1, ...updateData, updatedAt: new Date() };
      mockService.update.mockResolvedValue(updatedEntity);
      
      // Act
      await controller.update(req, res, next);
      
      // Assert
      expect(mockService.update).toHaveBeenCalledWith(1, updateData);
      expect(res.json).toHaveBeenCalledWith(updatedEntity);
    });
    
    it('should return 404 if entity to update not found', async () => {
      // Arrange
      const req = createMockRequest({
        params: { id: '999' },
        body: { name: 'Updated Entity' }
      });
      const res = createMockResponse();
      const next = createMockNext();
      mockService.update.mockResolvedValue(null);
      
      // Act
      await controller.update(req, res, next);
      
      // Assert
      expect(next).toHaveBeenCalledWith(expect.any(NotFoundError));
    });
    
    it('should validate id parameter', async () => {
      // Arrange
      const req = createMockRequest({
        params: { id: 'not-a-number' },
        body: { name: 'Updated Entity' }
      });
      const res = createMockResponse();
      const next = createMockNext();
      
      // Act
      await controller.update(req, res, next);
      
      // Assert
      expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
      expect(mockService.update).not.toHaveBeenCalled();
    });
  });
  
  describe('delete', () => {
    it('should delete entity using service', async () => {
      // Arrange
      const req = createMockRequest({
        params: { id: '1' }
      });
      const res = createMockResponse();
      const next = createMockNext();
      mockService.delete.mockResolvedValue(true);
      
      // Act
      await controller.delete(req, res, next);
      
      // Assert
      expect(mockService.delete).toHaveBeenCalledWith(1);
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.end).toHaveBeenCalled();
    });
    
    it('should return 404 if entity to delete not found', async () => {
      // Arrange
      const req = createMockRequest({
        params: { id: '999' }
      });
      const res = createMockResponse();
      const next = createMockNext();
      mockService.delete.mockResolvedValue(false);
      
      // Act
      await controller.delete(req, res, next);
      
      // Assert
      expect(next).toHaveBeenCalledWith(expect.any(NotFoundError));
    });
    
    it('should validate id parameter', async () => {
      // Arrange
      const req = createMockRequest({
        params: { id: 'not-a-number' }
      });
      const res = createMockResponse();
      const next = createMockNext();
      
      // Act
      await controller.delete(req, res, next);
      
      // Assert
      expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
      expect(mockService.delete).not.toHaveBeenCalled();
    });
  });
  
  describe('sendResponse', () => {
    it('should send successful response with default status code', () => {
      // Arrange
      const res = createMockResponse();
      const data = { test: 'data' };
      
      // Act
      controller['sendResponse'](res, data);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(data);
    });
    
    it('should send successful response with custom status code', () => {
      // Arrange
      const res = createMockResponse();
      const data = { test: 'data' };
      
      // Act
      controller['sendResponse'](res, data, 201);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(data);
    });
    
    it('should handle empty data with 204 status code', () => {
      // Arrange
      const res = createMockResponse();
      
      // Act
      controller['sendResponse'](res, null, 204);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.end).toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });
  
  describe('validateId', () => {
    it('should return numeric id when valid', () => {
      // Act
      const result = controller['validateId']('123');
      
      // Assert
      expect(result).toBe(123);
    });
    
    it('should throw ValidationError when id is not a number', () => {
      // Act & Assert
      expect(() => controller['validateId']('abc')).toThrow(ValidationError);
    });
    
    it('should throw ValidationError when id is negative', () => {
      // Act & Assert
      expect(() => controller['validateId']('-5')).toThrow(ValidationError);
    });
    
    it('should throw ValidationError when id is zero', () => {
      // Act & Assert
      expect(() => controller['validateId']('0')).toThrow(ValidationError);
    });
  });
  
  describe('customAction', () => {
    it('should handle custom controller methods', async () => {
      // Arrange
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();
      
      // Act
      await controller.customAction(req, res, next);
      
      // Assert
      expect(res.json).toHaveBeenCalledWith({ custom: true });
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});