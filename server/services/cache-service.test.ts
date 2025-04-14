/**
 * Tests for Cache Service
 * 
 * These tests ensure that our cache service correctly
 * stores, retrieves, and invalidates cached data.
 */
// @jest-environment node
import { cacheService } from './cache-service';

describe('CacheService', () => {
  
  beforeEach(() => {
    // Clear the cache service before each test
    cacheService.clear();
  });
  
  describe('set and get', () => {
    it('should store and retrieve data', () => {
      // Arrange
      const key = 'test-key';
      const data = { id: 1, name: 'Test Item' };
      
      // Act
      cacheService.set(key, data);
      const result = cacheService.get(key);
      
      // Assert
      expect(result).toEqual(data);
    });
    
    it('should return undefined for non-existent keys', () => {
      // Act
      const result = cacheService.get('non-existent-key');
      
      // Assert
      expect(result).toBeUndefined();
    });
    
    it('should respect TTL and expire items', () => {
      // Arrange
      jest.useFakeTimers();
      const key = 'expiring-key';
      const data = { id: 1, name: 'Expiring Item' };
      const ttlMs = 1000; // 1 second
      
      // Act
      cacheService.set(key, data, ttlMs);
      
      // Assert - before expiration
      expect(cacheService.get(key)).toEqual(data);
      
      // Advance time past TTL
      jest.advanceTimersByTime(ttlMs + 100);
      
      // Assert - after expiration
      expect(cacheService.get(key)).toBeUndefined();
      
      // Cleanup
      jest.useRealTimers();
    });
    
    it('should support infinite TTL', () => {
      // Arrange
      jest.useFakeTimers();
      const key = 'infinite-key';
      const data = { id: 1, name: 'Non-expiring Item' };
      
      // Act - set without TTL
      cacheService.set(key, data);
      
      // Advance time a long way
      jest.advanceTimersByTime(1000 * 60 * 60 * 24 * 365); // 1 year
      
      // Assert - still exists
      expect(cacheService.get(key)).toEqual(data);
      
      // Cleanup
      jest.useRealTimers();
    });
    
    it('should support overwriting existing keys', () => {
      // Arrange
      const key = 'overwrite-key';
      const initialData = { id: 1, name: 'Initial' };
      const updatedData = { id: 1, name: 'Updated' };
      
      // Act
      cacheService.set(key, initialData);
      cacheService.set(key, updatedData);
      const result = cacheService.get(key);
      
      // Assert
      expect(result).toEqual(updatedData);
    });
  });
  
  describe('has', () => {
    it('should return true for existing keys', () => {
      // Arrange
      const key = 'existing-key';
      cacheService.set(key, { data: 'value' });
      
      // Act
      const result = cacheService.has(key);
      
      // Assert
      expect(result).toBe(true);
    });
    
    it('should return false for non-existent keys', () => {
      // Act
      const result = cacheService.has('missing-key');
      
      // Assert
      expect(result).toBe(false);
    });
    
    it('should return false for expired keys', () => {
      // Arrange
      jest.useFakeTimers();
      const key = 'soon-to-expire';
      cacheService.set(key, { data: 'temp' }, 1000); // 1 second TTL
      
      // Assert - before expiration
      expect(cacheService.has(key)).toBe(true);
      
      // Advance time past TTL
      jest.advanceTimersByTime(1100);
      
      // Assert - after expiration
      expect(cacheService.has(key)).toBe(false);
      
      // Cleanup
      jest.useRealTimers();
    });
  });
  
  describe('delete', () => {
    it('should remove a specific key', () => {
      // Arrange
      const key1 = 'key1';
      const key2 = 'key2';
      
      cacheService.set(key1, 'value1');
      cacheService.set(key2, 'value2');
      
      // Act
      cacheService.delete(key1);
      
      // Assert
      expect(cacheService.get(key1)).toBeUndefined();
      expect(cacheService.get(key2)).toBe('value2'); // Other key unaffected
    });
    
    it('should do nothing when key does not exist', () => {
      // Arrange
      const key = 'existing-key';
      cacheService.set(key, 'value');
      
      // Act - delete non-existent key
      cacheService.delete('non-existent-key');
      
      // Assert - existing key still there
      expect(cacheService.get(key)).toBe('value');
    });
  });
  
  describe('clear', () => {
    it('should remove all keys when no prefix provided', () => {
      // Arrange
      cacheService.set('key1', 'value1');
      cacheService.set('key2', 'value2');
      cacheService.set('other', 'value3');
      
      // Act
      cacheService.clear();
      
      // Assert
      expect(cacheService.get('key1')).toBeUndefined();
      expect(cacheService.get('key2')).toBeUndefined();
      expect(cacheService.get('other')).toBeUndefined();
    });
    
    it('should only remove keys with specified prefix', () => {
      // Arrange
      cacheService.set('users:1', 'user1');
      cacheService.set('users:2', 'user2');
      cacheService.set('products:1', 'product1');
      
      // Act
      cacheService.clear('users:');
      
      // Assert
      expect(cacheService.get('users:1')).toBeUndefined();
      expect(cacheService.get('users:2')).toBeUndefined();
      expect(cacheService.get('products:1')).toBe('product1'); // Unaffected
    });
    
    it('should handle clear with non-matching prefix', () => {
      // Arrange
      cacheService.set('key1', 'value1');
      
      // Act
      cacheService.clear('nonexistent:');
      
      // Assert
      expect(cacheService.get('key1')).toBe('value1'); // Unaffected
    });
  });
  
  describe('size', () => {
    it('should return the correct number of items in cache', () => {
      // Arrange - empty cache
      
      // Act & Assert
      expect(cacheService.size()).toBe(0);
      
      // Add items
      cacheService.set('key1', 'value1');
      cacheService.set('key2', 'value2');
      
      // Act & Assert
      expect(cacheService.size()).toBe(2);
      
      // Remove an item
      cacheService.delete('key1');
      
      // Act & Assert
      expect(cacheService.size()).toBe(1);
    });
    
    it('should not count expired items', () => {
      // Arrange
      jest.useFakeTimers();
      
      cacheService.set('key1', 'value1');
      cacheService.set('key2', 'value2', 1000); // 1 second TTL
      
      // Act & Assert - before expiration
      expect(cacheService.size()).toBe(2);
      
      // Advance time past TTL
      jest.advanceTimersByTime(1100);
      
      // Act & Assert - after expiration
      expect(cacheService.size()).toBe(1);
      
      // Cleanup
      jest.useRealTimers();
    });
  });
  
  describe('stats', () => {
    it('should provide accurate cache statistics', () => {
      // Arrange
      cacheService.set('key1', 'value1');
      cacheService.get('key1'); // Hit
      cacheService.get('missing'); // Miss
      
      // Act
      const stats = cacheService.stats();
      
      // Assert
      expect(stats.size).toBe(1);
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(0.5); // 1 hit, 1 miss = 50%
    });
    
    it('should handle zero hits and misses', () => {
      // Act
      const stats = cacheService.stats();
      
      // Assert
      expect(stats.size).toBe(0);
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.hitRate).toBe(0); // No hits or misses
    });
  });
});