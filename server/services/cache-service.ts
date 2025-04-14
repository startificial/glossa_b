/**
 * Cache Service
 * 
 * This service provides in-memory caching for frequently accessed data
 * to reduce database load and improve response times.
 */

// Cache configuration
interface CacheConfig {
  defaultTTL: number;  // Default time-to-live in milliseconds
}

// Cache entry structure
interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/**
 * In-memory cache service for performance optimization
 */
class CacheService {
  private cache: Map<string, CacheEntry<any>>;
  private config: CacheConfig;
  
  constructor(config: Partial<CacheConfig> = {}) {
    this.cache = new Map();
    this.config = {
      defaultTTL: config.defaultTTL || 5 * 60 * 1000, // 5 minutes default
    };
    
    // Set up periodic cache cleanup
    setInterval(() => this.cleanupExpiredEntries(), 60 * 1000); // Clean up every minute
  }
  
  /**
   * Set a value in the cache
   * @param key Cache key
   * @param value Value to store
   * @param ttl Time-to-live in milliseconds (optional, uses default if not provided)
   */
  set<T>(key: string, value: T, ttl?: number): void {
    const expiresAt = Date.now() + (ttl || this.config.defaultTTL);
    this.cache.set(key, { value, expiresAt });
  }
  
  /**
   * Get a value from the cache
   * @param key Cache key
   * @returns The cached value, or undefined if not found or expired
   */
  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key);
    
    // Return undefined if not in cache or expired
    if (!entry || entry.expiresAt < Date.now()) {
      // Clean up expired entry if needed
      if (entry && entry.expiresAt < Date.now()) {
        this.cache.delete(key);
      }
      return undefined;
    }
    
    return entry.value as T;
  }
  
  /**
   * Check if a key exists in the cache and is not expired
   * @param key Cache key
   * @returns True if the key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    return !!entry && entry.expiresAt >= Date.now();
  }
  
  /**
   * Delete a key from the cache
   * @param key Cache key
   */
  delete(key: string): void {
    this.cache.delete(key);
  }
  
  /**
   * Clear all entries from the cache
   */
  clear(): void {
    this.cache.clear();
  }
  
  /**
   * Remove all expired entries from the cache
   */
  private cleanupExpiredEntries(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt < now) {
        this.cache.delete(key);
      }
    }
  }
  
  /**
   * Get the value from cache if it exists, otherwise call the provider function,
   * cache the result, and return it
   * 
   * @param key Cache key
   * @param provider Function that returns the value if not in cache
   * @param ttl Optional TTL in milliseconds
   * @returns The value from cache or provider
   */
  async getOrSet<T>(key: string, provider: () => Promise<T>, ttl?: number): Promise<T> {
    // Try to get from cache first
    const cachedValue = this.get<T>(key);
    if (cachedValue !== undefined) {
      return cachedValue;
    }
    
    // Call provider to get the value
    const value = await provider();
    
    // Cache the result
    this.set(key, value, ttl);
    
    return value;
  }
  
  /**
   * Invalidate all cache entries that match a key pattern
   * @param keyPattern String or RegExp to match keys against
   */
  invalidatePattern(keyPattern: string | RegExp): void {
    const pattern = typeof keyPattern === 'string' 
      ? new RegExp(`^${keyPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`)
      : keyPattern;
      
    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        this.cache.delete(key);
      }
    }
  }
}

// Create and export a singleton instance
export const cacheService = new CacheService();

// Export other utilities
export const CACHE_KEYS = {
  PROJECTS: 'projects',
  PROJECT_BY_ID: (id: number) => `project:${id}`,
  REQUIREMENTS_BY_PROJECT: (projectId: number) => `requirements:project:${projectId}`,
  ACTIVITIES_GLOBAL: 'activities:global',
  ACTIVITIES_BY_PROJECT: (projectId: number) => `activities:project:${projectId}`,
  USER_BY_ID: (id: number) => `user:${id}`,
  USER_BY_USERNAME: (username: string) => `user:username:${username}`,
};