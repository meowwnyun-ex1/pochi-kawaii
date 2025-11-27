/**
 * API Client with retry mechanism and better error handling
 */
interface RetryOptions {
    maxRetries?: number;
    retryDelay?: number;
    retryableStatuses?: number[];
}
/**
 * Fetch with retry mechanism
 */
export declare function fetchWithRetry(url: string, options?: RequestInit, retryOptions?: RetryOptions): Promise<Response>;
/**
 * API client with automatic retry
 */
export declare const apiClient: {
    get: (endpoint: string, options?: RequestInit, retryOptions?: RetryOptions) => Promise<Response>;
    post: (endpoint: string, body?: unknown, options?: RequestInit, retryOptions?: RetryOptions) => Promise<Response>;
    postFormData: (endpoint: string, formData: FormData, options?: RequestInit, retryOptions?: RetryOptions) => Promise<Response>;
};
export default apiClient;
