/**
 * API Client
 * 
 * Centralized API request handling with consistent error management
 * and request/response logging.
 */

export type RequestMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface RequestOptions<T = unknown> {
  method?: RequestMethod;
  data?: T;
  headers?: Record<string, string>;
  parseJson?: boolean;
}

/**
 * Handle API response errors consistently
 */
async function handleResponseError(res: Response): Promise<never> {
  let errorText: string;
  
  try {
    // Try to parse response as JSON first
    const errorJson = await res.json();
    errorText = errorJson.message || res.statusText;
  } catch (e) {
    // If not JSON, get as text
    try {
      errorText = await res.text();
    } catch (e2) {
      errorText = res.statusText;
    }
  }
  
  throw new Error(`${res.status}: ${errorText}`);
}

/**
 * Make an API request with consistent error handling
 */
export async function apiRequest<ResponseType = any, RequestDataType = any>(
  url: string,
  options: RequestOptions<RequestDataType> = {}
): Promise<ResponseType> {
  const { 
    method = 'GET', 
    data, 
    headers = {}, 
    parseJson = true 
  } = options;
  
  // Debug log
  if (process.env.NODE_ENV === 'development') {
    console.log(`API Request: ${method} ${url}`, { data });
  }
  
  // Set common headers
  const requestHeaders = {
    ...(data ? { 'Content-Type': 'application/json' } : {}),
    ...headers
  };
  
  try {
    const res = await fetch(url, {
      method,
      headers: requestHeaders,
      body: data ? JSON.stringify(data) : undefined,
      credentials: 'include',
    });
    
    // Debug log
    if (process.env.NODE_ENV === 'development') {
      console.log(`API Response status: ${res.status} ${res.statusText}`);
    }
    
    // Handle non-ok responses
    if (!res.ok) {
      await handleResponseError(res);
    }
    
    // Parse JSON if needed and possible
    if (parseJson && res.headers.get('content-type')?.includes('application/json')) {
      const jsonResponse = await res.json();
      
      // Debug log
      if (process.env.NODE_ENV === 'development') {
        console.log('API Response JSON:', jsonResponse);
      }
      
      return jsonResponse as ResponseType;
    }
    
    return res as unknown as ResponseType;
  } catch (error) {
    console.error(`API Request failed for ${method} ${url}:`, error);
    throw error;
  }
}

// Typed request helpers
export const get = <T>(url: string, options?: Omit<RequestOptions, 'method' | 'data'>) => 
  apiRequest<T>(url, { ...options, method: 'GET' });

export const post = <ResponseType, RequestDataType = any>(
  url: string, 
  data?: RequestDataType, 
  options?: Omit<RequestOptions, 'method' | 'data'>
) => apiRequest<ResponseType, RequestDataType>(url, { ...options, method: 'POST', data });

export const put = <ResponseType, RequestDataType = any>(
  url: string, 
  data?: RequestDataType, 
  options?: Omit<RequestOptions, 'method' | 'data'>
) => apiRequest<ResponseType, RequestDataType>(url, { ...options, method: 'PUT', data });

export const patch = <ResponseType, RequestDataType = any>(
  url: string, 
  data?: RequestDataType, 
  options?: Omit<RequestOptions, 'method' | 'data'>
) => apiRequest<ResponseType, RequestDataType>(url, { ...options, method: 'PATCH', data });

export const del = <T>(url: string, options?: Omit<RequestOptions, 'method'>) => 
  apiRequest<T>(url, { ...options, method: 'DELETE' });