import { ApiResponse } from "../../../shared/types";

/**
 * Gold Standard Fetch Wrapper
 * - Strictly typed responses
 * - Automatic credential handling for HttpOnly cookies
 * - Standardized error handling
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

interface FetchOptions extends RequestInit {
    params?: Record<string, string | number>;
}

export async function apiRequest<T>(
    endpoint: string,
    options: FetchOptions = {}
): Promise<T> {
    const { params, ...customConfig } = options;
    
    // Construct URL with query parameters if provided
    const url = new URL(`${API_BASE_URL}${endpoint}`);
    if (params) {
        Object.keys(params).forEach((key) => 
            url.searchParams.append(key, params[key].toString())
        );
    }

    const headers: HeadersInit = {
        "Content-Type": "application/json",
        ...customConfig.headers,
    };

    const config: RequestInit = {
        ...customConfig,
        headers,
        // Mandatory for HttpOnly Cookie Auth (Access/Refresh tokens)
        credentials: "include", 
    };

    try {
        const response = await fetch(url.toString(), config);
        
        // Handle No Content (204)
        if (response.status === 204) {
            return {} as T;
        }

        const result: ApiResponse<T> = await response.json();

        if (!response.ok || !result.success) {
            // Throw a standardized error object for TanStack Query to catch
            const error = new Error(result.message || "An unexpected error occurred");
            (error as any).code = result.error?.code || "INTERNAL_ERROR";
            (error as any).status = response.status;
            throw error;
        }

        return result.data as T;
    } catch (error: any) {
        // Log errors in development; in production, these could go to Sentry
        if (process.env.NODE_ENV === "development") {
            console.error(`[API Error] ${options.method || "GET"} ${endpoint}:`, error);
        }
        throw error;
    }
}

// Convenience methods
export const api = {
    get: <T>(endpoint: string, options?: FetchOptions) => 
        apiRequest<T>(endpoint, { ...options, method: "GET" }),
    
    post: <T>(endpoint: string, body: any, options?: FetchOptions) => 
        apiRequest<T>(endpoint, { ...options, method: "POST", body: JSON.stringify(body) }),
    
    put: <T>(endpoint: string, body: any, options?: FetchOptions) => 
        apiRequest<T>(endpoint, { ...options, method: "PUT", body: JSON.stringify(body) }),
    
    patch: <T>(endpoint: string, body: any, options?: FetchOptions) => 
        apiRequest<T>(endpoint, { ...options, method: "PATCH", body: JSON.stringify(body) }),
    
    delete: <T>(endpoint: string, options?: FetchOptions) => 
        apiRequest<T>(endpoint, { ...options, method: "DELETE" }),
};