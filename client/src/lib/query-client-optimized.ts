/**
 * Optimized Query Client Configuration
 * 
 * This module configures TanStack Query with performance optimizations:
 * - Intelligent caching with stale times based on data volatility
 * - Deduplication of API requests
 * - Error handling
 * - Request batching
 * - Prefetching strategies
 */
import { QueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';

/**
 * Batched fetch implementation to reduce multiple parallel requests
 * This uses the fetch API under the hood but optimizes server requests
 */
class BatchedRequestManager {
  private batchTimers: Map<string, NodeJS.Timeout> = new Map();
  private batchedRequests: Map<string, Set<() => void>> = new Map();
  private batchWindow = 50; // 50ms window to batch requests
  
  /**
   * Process a request, potentially batching it with similar requests
   * @param endpoint API endpoint
   * @param options Fetch options
   * @returns Promise with the fetch result
   */
  async fetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
    // Don't batch non-GET requests
    if (options.method && options.method !== 'GET') {
      return fetch(endpoint, options);
    }
    
    // Create a unique key for this request
    const requestKey = `${endpoint}|${JSON.stringify(options)}`;
    
    return new Promise((resolve, reject) => {
      // Create a function to execute this specific request
      const executeRequest = () => {
        fetch(endpoint, options)
          .then(resolve)
          .catch(reject);
      };
      
      // If no batch exists for this endpoint, create one
      if (!this.batchedRequests.has(requestKey)) {
        this.batchedRequests.set(requestKey, new Set());
        
        // Schedule the batch to execute
        const timerId = setTimeout(() => {
          // Execute the first request
          executeRequest();
          
          // Clean up the batch
          this.batchedRequests.delete(requestKey);
          this.batchTimers.delete(requestKey);
        }, this.batchWindow);
        
        this.batchTimers.set(requestKey, timerId);
      }
      
      // Add this request to the batch
      this.batchedRequests.get(requestKey)!.add(executeRequest);
    });
  }
}

// Create a singleton instance
const batchedRequestManager = new BatchedRequestManager();

/**
 * Helper function to get the correct API URL
 * @param endpoint API endpoint path (e.g., '/api/customers')
 * @returns Full URL with the correct port
 */
function getApiUrl(endpoint: string): string {
  // If endpoint already starts with http:// or https://, return as is
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    return endpoint;
  }
  
  // If we're in a deployed Replit environment, use the same origin 
  // This ensures we use the correct port in the deployed environment
  const baseUrl = window.location.origin;
  
  // Clean the endpoint to ensure it starts with "/"
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  
  // Log the constructed URL for debugging
  console.log(`Constructed API URL: ${baseUrl}${cleanEndpoint}`);
  
  return `${baseUrl}${cleanEndpoint}`;
}

/**
 * Enhanced API request function with batching, error handling, and typing
 * @param endpoint API endpoint
 * @param options Fetch options
 * @returns Promise with the typed response data
 */
export async function apiRequest<T>(
  endpoint: string, 
  options: RequestInit = {}
): Promise<T> {
  try {
    // Get the full API URL
    const apiUrl = getApiUrl(endpoint);
    
    console.log(`Making API request to: ${apiUrl}`);
    
    // Use the batched request manager for fetch operations
    const response = await batchedRequestManager.fetch(apiUrl, {
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      },
      ...options,
    });
    
    // Handle non-successful responses
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`API request to ${apiUrl} failed with status ${response.status}`, {
        errorData,
        response
      });
      
      // Enhanced error with diagnostics
      throw new Error(
        errorData.message || 
        `API request failed with status ${response.status}. URL: ${apiUrl}. Browser: ${window.navigator.userAgent}`
      );
    }
    
    // Parse and return the response data
    return await response.json() as T;
  } catch (error) {
    console.error(`API request error for ${endpoint}:`, error);
    throw error;
  }
}

/**
 * Default query configurations based on data volatility
 */
const staleTimeConfigs = {
  // Static data rarely changes, can be cached longer
  static: 1000 * 60 * 30, // 30 minutes
  
  // Reference data changes occasionally, moderate cache time
  reference: 1000 * 60 * 5, // 5 minutes
  
  // Dynamic data changes frequently, short cache time
  dynamic: 1000 * 30, // 30 seconds
  
  // Realtime data, minimal caching
  realtime: 1000 * 10, // 10 seconds
};

/**
 * Helper functions to create query keys with appropriate stale time configuration
 */
export const createQueryKeys = {
  static: (base: string, ...parts: (string | number)[]) => ({
    queryKey: [base, ...parts],
    staleTime: staleTimeConfigs.static,
  }),
  
  reference: (base: string, ...parts: (string | number)[]) => ({
    queryKey: [base, ...parts],
    staleTime: staleTimeConfigs.reference,
  }),
  
  dynamic: (base: string, ...parts: (string | number)[]) => ({
    queryKey: [base, ...parts],
    staleTime: staleTimeConfigs.dynamic,
  }),
  
  realtime: (base: string, ...parts: (string | number)[]) => ({
    queryKey: [base, ...parts],
    staleTime: staleTimeConfigs.realtime,
  }),
};

/**
 * Default query client with performance optimizations
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Global defaults
      staleTime: staleTimeConfigs.dynamic, // Default staleTime
      refetchOnWindowFocus: true, // Refresh data when window regains focus
      refetchOnReconnect: true, // Refresh data when network reconnects
      refetchOnMount: true, // Refresh data when component mounts if stale
      retry: 2, // Retry failed queries twice
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
      
      // Default query function that works with our API endpoints
      queryFn: async ({ queryKey }) => {
        // Convert query key to API path
        let endpoint = '/';
        
        if (Array.isArray(queryKey) && queryKey.length > 0) {
          const firstKey = queryKey[0];
          endpoint = typeof firstKey === 'string' ? firstKey : String(firstKey);
        }
          
        return apiRequest(endpoint);
      },
    },
    mutations: {
      // Show toast on error by default
      onError: (error: Error) => {
        toast({
          title: "Error",
          description: error.message || "An error occurred",
          variant: "destructive",
        });
      },
    },
  },
});

/**
 * Type-safe API fetch wrapper with improved logging
 * @param endpoint API endpoint
 * @param options Optional fetch options
 * @returns Promise with typed data
 */
export async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  console.log(`Fetch API called for endpoint: ${endpoint}`);
  return apiRequest<T>(endpoint, options);
}

/**
 * Prefetch helper to preload data before it's needed
 * @param endpoint API endpoint to prefetch
 * @param queryKey Query key for caching
 * @param staleTime How long the data should be considered fresh
 */
export function prefetchQuery(
  endpoint: string,
  queryKey: unknown[],
  staleTime = staleTimeConfigs.dynamic
): Promise<void> {
  console.log(`Prefetching data for endpoint: ${endpoint}`);
  return queryClient.prefetchQuery({
    queryKey,
    queryFn: () => apiRequest(endpoint),
    staleTime,
  });
}