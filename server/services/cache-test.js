// @ts-check
import { cacheService } from './cache-service.js';

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