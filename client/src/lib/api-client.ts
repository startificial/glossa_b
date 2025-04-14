/**
 * API Client
 * 
 * A standardized HTTP client for making API requests.
 * This centralizes request handling, error processing,
 * and provides consistent request/response interceptors.
 */
import { ENV_CONFIG } from '@shared/config';
import { logger } from './logger';

/**
 * Base options for all API requests
 */
interface ApiClientOptions {
  /** Base URL for API requests */
  baseUrl: string;
  /** Default headers to include with all requests */
  defaultHeaders?: Record<string, string>;
  /** Default timeout in milliseconds */
  timeout?: number;
  /** Whether to include credentials (cookies) */
  withCredentials?: boolean;
}

/**
 * Request configuration for a specific API call
 */
interface RequestConfig {
  /** HTTP method */
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  /** URL path (will be appended to baseUrl) */
  url: string;
  /** URL query parameters */
  params?: Record<string, string | number | boolean | undefined | null>;
  /** Request body data */
  data?: any;
  /** Request headers */
  headers?: Record<string, string>;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Whether to parse the response as JSON */
  parseJson?: boolean;
  /** Whether to include credentials (cookies) */
  withCredentials?: boolean;
  /** Request ID for tracing (auto-generated if not provided) */
  requestId?: string;
}

/**
 * API client error class
 */
export class ApiError extends Error {
  /** HTTP status code */
  statusCode: number;
  /** Response data */
  data?: any;
  /** Original response */
  response?: Response;
  /** Request configuration */
  config: RequestConfig;
  /** Request ID */
  requestId: string;

  constructor(message: string, statusCode: number, config: RequestConfig, response?: Response, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.response = response;
    this.data = data;
    this.config = config;
    this.requestId = config.requestId || 'unknown';
  }
}

/**
 * API client for making HTTP requests
 */
export class ApiClient {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;
  private timeout: number;
  private withCredentials: boolean;

  /**
   * Create a new API client
   */
  constructor(options: ApiClientOptions) {
    this.baseUrl = options.baseUrl.endsWith('/') 
      ? options.baseUrl.slice(0, -1) 
      : options.baseUrl;
    
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.defaultHeaders,
    };
    
    this.timeout = options.timeout || 30000; // 30 seconds default
    this.withCredentials = options.withCredentials ?? true;
  }

  /**
   * Make a GET request
   */
  async get<T = any>(url: string, config: Omit<RequestConfig, 'method' | 'url'> = {}): Promise<T> {
    return this.request<T>({ ...config, method: 'GET', url });
  }

  /**
   * Make a POST request
   */
  async post<T = any>(url: string, data?: any, config: Omit<RequestConfig, 'method' | 'url' | 'data'> = {}): Promise<T> {
    return this.request<T>({ ...config, method: 'POST', url, data });
  }

  /**
   * Make a PUT request
   */
  async put<T = any>(url: string, data?: any, config: Omit<RequestConfig, 'method' | 'url' | 'data'> = {}): Promise<T> {
    return this.request<T>({ ...config, method: 'PUT', url, data });
  }

  /**
   * Make a PATCH request
   */
  async patch<T = any>(url: string, data?: any, config: Omit<RequestConfig, 'method' | 'url' | 'data'> = {}): Promise<T> {
    return this.request<T>({ ...config, method: 'PATCH', url, data });
  }

  /**
   * Make a DELETE request
   */
  async delete<T = any>(url: string, config: Omit<RequestConfig, 'method' | 'url'> = {}): Promise<T> {
    return this.request<T>({ ...config, method: 'DELETE', url });
  }

  /**
   * Make a request with the given configuration
   */
  async request<T = any>(config: RequestConfig): Promise<T> {
    // Initialize request configuration
    const requestConfig: RequestConfig = {
      method: 'GET',
      parseJson: true,
      withCredentials: this.withCredentials,
      timeout: this.timeout,
      requestId: `req-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`,
      ...config,
    };

    // Build the URL with query parameters
    const url = this.buildUrl(requestConfig.url, requestConfig.params);
    
    // Build request headers
    const headers = this.buildHeaders(requestConfig.headers);

    // Start timing the request
    const startTime = Date.now();
    
    try {
      // Log the request
      logger.debug('API request', {
        method: requestConfig.method,
        url,
        requestId: requestConfig.requestId,
      });

      // Create AbortController for timeout handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, requestConfig.timeout);

      // Prepare request options
      const fetchOptions: RequestInit = {
        method: requestConfig.method,
        headers,
        credentials: requestConfig.withCredentials ? 'include' : 'same-origin',
        signal: controller.signal,
      };

      // Add body if this is not a GET request
      if (requestConfig.method !== 'GET' && requestConfig.data !== undefined) {
        fetchOptions.body = typeof requestConfig.data === 'string'
          ? requestConfig.data
          : JSON.stringify(requestConfig.data);
      }

      // Make the request
      const response = await fetch(url, fetchOptions);
      
      // Clear timeout
      clearTimeout(timeoutId);

      // Process the response
      let responseData: any;
      
      if (requestConfig.parseJson && response.headers.get('Content-Type')?.includes('application/json')) {
        responseData = await response.json();
      } else if (response.status !== 204) { // No content
        responseData = await response.text();
      }

      // Calculate request duration
      const duration = Date.now() - startTime;

      // Handle error responses
      if (!response.ok) {
        // Log error response
        logger.warn('API error response', {
          method: requestConfig.method,
          url,
          status: response.status,
          duration: `${duration}ms`,
          requestId: requestConfig.requestId,
          responseData,
        });

        throw new ApiError(
          responseData?.message || `API request failed with status ${response.status}`,
          response.status,
          requestConfig,
          response,
          responseData
        );
      }

      // Log successful response
      logger.debug('API response', {
        method: requestConfig.method,
        url,
        status: response.status,
        duration: `${duration}ms`,
        requestId: requestConfig.requestId,
      });

      return responseData as T;
    } catch (error) {
      // Calculate request duration even for failures
      const duration = Date.now() - startTime;

      // Handle request errors
      if (error instanceof ApiError) {
        throw error;
      }

      // Handle timeout
      if (error instanceof DOMException && error.name === 'AbortError') {
        logger.error('API request timeout', {
          method: requestConfig.method,
          url,
          duration: `${duration}ms`,
          timeout: requestConfig.timeout,
          requestId: requestConfig.requestId,
        });

        throw new ApiError(
          'Request timeout',
          408,
          requestConfig
        );
      }

      // Handle network/other errors
      logger.error('API request failed', {
        method: requestConfig.method,
        url,
        duration: `${duration}ms`,
        error: error instanceof Error ? error.message : String(error),
        requestId: requestConfig.requestId,
      });

      throw new ApiError(
        error instanceof Error ? error.message : 'Network error',
        0, // 0 indicates a network or client error rather than an HTTP status code
        requestConfig
      );
    }
  }

  /**
   * Build the complete URL including query parameters
   */
  private buildUrl(path: string, params?: Record<string, string | number | boolean | undefined | null>): string {
    // Ensure path starts with a /
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    
    // Start with the base URL and path
    let url = `${this.baseUrl}${normalizedPath}`;
    
    // Add query parameters if provided
    if (params) {
      const queryParams = new URLSearchParams();
      
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value));
        }
      }
      
      const queryString = queryParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }
    
    return url;
  }

  /**
   * Build request headers by combining default and request-specific headers
   */
  private buildHeaders(requestHeaders?: Record<string, string>): HeadersInit {
    return {
      ...this.defaultHeaders,
      ...requestHeaders,
    };
  }
}

/**
 * Create default API client
 */
export const apiClient = new ApiClient({
  baseUrl: ENV_CONFIG.API_URL,
  withCredentials: true,
});