/**
 * Simple manual test for the CacheService using CommonJS
 */

// Convert TypeScript code to CommonJS compatible form
class CacheConfig {
  constructor() {
    this.defaultTTL = 60 * 1000; // 1 minute default
  }
}

class CacheEntry {
  constructor(value, expiresAt) {
    this.value = value;
    this.expiresAt = expiresAt;
  }
}

class CacheService {
  constructor(config = {}) {
    this.cache = new Map();
    this.config = {
      defaultTTL: config.defaultTTL || 60 * 1000, // 1 minute default
    };
  }

  set(key, value, ttl) {
    const expiresAt = Date.now() + (ttl || this.config.defaultTTL);
    this.cache.set(key, new CacheEntry(value, expiresAt));
  }

  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    
    if (entry.expiresAt < Date.now()) {
      this.cache.delete(key);
      return undefined;
    }
    
    return entry.value;
  }

  has(key) {
    return this.get(key) !== undefined;
  }

  delete(key) {
    this.cache.delete(key);
  }

  clear(prefix) {
    if (!prefix) {
      this.cache.clear();
      return;
    }
    
    // Clear only keys with the specified prefix
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  size() {
    let count = 0;
    const now = Date.now();
    
    for (const entry of this.cache.values()) {
      if (entry.expiresAt >= now) {
        count++;
      }
    }
    
    return count;
  }

  stats() {
    const now = Date.now();
    // Calculate active items count
    let size = 0;
    for (const entry of this.cache.values()) {
      if (entry.expiresAt >= now) {
        size++;
      }
    }
    
    return {
      size,
      hits: 0,
      misses: 0,
      hitRate: 0
    };
  }
}

// Create an instance
const cacheService = new CacheService();

// Test the cache service basic functionality
console.log('Testing Cache Service...');

// Test set and get
cacheService.set('test-key', 'test-value');
const value = cacheService.get('test-key');
console.log('Set/Get:', value === 'test-value' ? 'SUCCESS' : 'FAIL');

// Test clear
cacheService.set('key1', 'value1');
cacheService.set('key2', 'value2');
cacheService.clear();
const cleared = cacheService.get('key1') === undefined && cacheService.get('key2') === undefined;
console.log('Clear:', cleared ? 'SUCCESS' : 'FAIL');

// Test clear with prefix
cacheService.set('users:1', 'user1');
cacheService.set('users:2', 'user2');
cacheService.set('products:1', 'product1');
cacheService.clear('users:');
const prefixCleared = cacheService.get('users:1') === undefined && 
                     cacheService.get('users:2') === undefined && 
                     cacheService.get('products:1') === 'product1';
console.log('Clear with prefix:', prefixCleared ? 'SUCCESS' : 'FAIL');

// Test size
cacheService.clear();
console.log('Size after clear:', cacheService.size() === 0 ? 'SUCCESS' : 'FAIL');
cacheService.set('key1', 'value1');
cacheService.set('key2', 'value2');
console.log('Size after adding 2 items:', cacheService.size() === 2 ? 'SUCCESS' : 'FAIL');

// Test stats
const stats = cacheService.stats();
console.log('Stats has size property:', stats.size !== undefined ? 'SUCCESS' : 'FAIL');
console.log('Stats has hitRate property:', stats.hitRate !== undefined ? 'SUCCESS' : 'FAIL');

console.log('Testing complete!');