/**
 * Tests for API Client
 * 
 * These tests ensure that our API client correctly
 * handles requests, responses, and errors.
 */
import { apiClient, ApiError } from './api-client';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('API Client', () => {
  // Clear mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('get', () => {
    it('should make a GET request with correct URL', async () => {
      // Arrange
      const mockResponse = { data: 'test' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });
      
      // Act
      const result = await apiClient.get('/api/test');
      
      // Assert
      expect(mockFetch).toHaveBeenCalledWith('/api/test', expect.objectContaining({
        method: 'GET',
      }));
      expect(result).toEqual(mockResponse);
    });
    
    it('should append query parameters to URL', async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({}),
      });
      
      // Act
      await apiClient.get('/api/test', { id: 123, filter: 'active' });
      
      // Assert
      expect(mockFetch).toHaveBeenCalledWith('/api/test?id=123&filter=active', expect.anything());
    });
    
    it('should properly encode query parameters', async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({}),
      });
      
      // Act
      await apiClient.get('/api/test', { name: 'John Doe', tag: 'special&char' });
      
      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/test?name=John%20Doe&tag=special%26char', 
        expect.anything()
      );
    });
    
    it('should throw ApiError for non-ok responses', async () => {
      // Arrange
      const errorMessage = { message: 'Not found' };
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => errorMessage,
      });
      
      // Act & Assert
      await expect(apiClient.get('/api/missing')).rejects.toThrow(ApiError);
      await expect(apiClient.get('/api/missing')).rejects.toMatchObject({
        status: 404,
        statusText: 'Not Found',
        data: errorMessage,
      });
    });
    
    it('should handle network errors', async () => {
      // Arrange
      const networkError = new Error('Network failure');
      mockFetch.mockRejectedValueOnce(networkError);
      
      // Act & Assert
      await expect(apiClient.get('/api/test')).rejects.toThrow('Network failure');
    });
    
    it('should include custom headers', async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({}),
      });
      
      const headers = { 'X-Custom-Header': 'test-value' };
      
      // Act
      await apiClient.get('/api/test', {}, headers);
      
      // Assert
      expect(mockFetch).toHaveBeenCalledWith('/api/test', expect.objectContaining({
        headers: expect.objectContaining({
          'X-Custom-Header': 'test-value',
        }),
      }));
    });
  });
  
  describe('post', () => {
    it('should make a POST request with correct data', async () => {
      // Arrange
      const mockResponse = { id: 1, name: 'Created Item' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => mockResponse,
      });
      
      const postData = { name: 'New Item' };
      
      // Act
      const result = await apiClient.post('/api/items', postData);
      
      // Assert
      expect(mockFetch).toHaveBeenCalledWith('/api/items', expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify(postData),
      }));
      expect(result).toEqual(mockResponse);
    });
    
    it('should handle empty request body', async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({}),
      });
      
      // Act
      await apiClient.post('/api/trigger-action');
      
      // Assert
      expect(mockFetch).toHaveBeenCalledWith('/api/trigger-action', expect.objectContaining({
        method: 'POST',
        body: undefined,
      }));
    });
  });
  
  describe('put', () => {
    it('should make a PUT request with correct data', async () => {
      // Arrange
      const mockResponse = { id: 1, name: 'Updated Item' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });
      
      const putData = { name: 'Updated Item' };
      
      // Act
      const result = await apiClient.put('/api/items/1', putData);
      
      // Assert
      expect(mockFetch).toHaveBeenCalledWith('/api/items/1', expect.objectContaining({
        method: 'PUT',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify(putData),
      }));
      expect(result).toEqual(mockResponse);
    });
  });
  
  describe('patch', () => {
    it('should make a PATCH request with correct data', async () => {
      // Arrange
      const mockResponse = { id: 1, name: 'Partially Updated Item' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });
      
      const patchData = { name: 'Partially Updated Item' };
      
      // Act
      const result = await apiClient.patch('/api/items/1', patchData);
      
      // Assert
      expect(mockFetch).toHaveBeenCalledWith('/api/items/1', expect.objectContaining({
        method: 'PATCH',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify(patchData),
      }));
      expect(result).toEqual(mockResponse);
    });
  });
  
  describe('delete', () => {
    it('should make a DELETE request', async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        json: async () => {
          throw new Error('No content to parse');
        },
      });
      
      // Act
      const result = await apiClient.delete('/api/items/1');
      
      // Assert
      expect(mockFetch).toHaveBeenCalledWith('/api/items/1', expect.objectContaining({
        method: 'DELETE',
      }));
      expect(result).toBeUndefined();
    });
    
    it('should handle DELETE requests that return content', async () => {
      // Arrange
      const mockResponse = { message: 'Item deleted' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });
      
      // Act
      const result = await apiClient.delete('/api/items/1');
      
      // Assert
      expect(result).toEqual(mockResponse);
    });
  });
  
  describe('ApiError', () => {
    it('should have correct properties', () => {
      // Arrange
      const status = 400;
      const statusText = 'Bad Request';
      const data = { message: 'Invalid input' };
      
      // Act
      const error = new ApiError('API Error', status, statusText, data);
      
      // Assert
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('API Error');
      expect(error.status).toBe(status);
      expect(error.statusText).toBe(statusText);
      expect(error.data).toEqual(data);
    });
  });
});