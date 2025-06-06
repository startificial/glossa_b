import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let errorText;
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
}

export async function apiRequest<T = any>(
  methodOrUrl: string,
  endpointOrOptions?: string | {
    method?: string;
    data?: unknown;
  },
  dataOrParseJson?: unknown | boolean
): Promise<T> {
  // Handle both function signatures:
  // 1. apiRequest(method, endpoint, data)
  // 2. apiRequest(url, options, parseJson)
  
  let method: string;
  let url: string;
  let data: unknown;
  let parseJson: boolean = true;
  
  if (typeof endpointOrOptions === 'string') {
    // First signature: apiRequest(method, endpoint, data)
    method = methodOrUrl;
    url = endpointOrOptions;
    data = dataOrParseJson;
  } else {
    // Second signature: apiRequest(url, options, parseJson)
    url = methodOrUrl;
    const options = endpointOrOptions || {};
    method = options.method || 'GET';
    data = options.data;
    parseJson = typeof dataOrParseJson === 'boolean' ? dataOrParseJson : true;
  }
  
  console.log(`API Request: ${method} ${url}`, { data });
  
  try {
    const res = await fetch(url, {
      method,
      headers: data ? { "Content-Type": "application/json" } : {},
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });

    console.log(`API Response status: ${res.status} ${res.statusText}`);
    
    await throwIfResNotOk(res);
    
    if (parseJson && res.headers.get("content-type")?.includes("application/json")) {
      const jsonResponse = await res.json();
      console.log("API Response JSON:", jsonResponse);
      return jsonResponse as T;
    }
    
    return res as unknown as T;
  } catch (error) {
    console.error(`API Request failed for ${method} ${url}:`, error);
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
