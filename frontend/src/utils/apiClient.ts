/**
 * API Client with retry mechanism and better error handling
 */

interface RetryOptions {
  maxRetries?: number;
  retryDelay?: number;
  retryableStatuses?: number[];
}

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  retryDelay: 1000, // 1 second
  retryableStatuses: [408, 429, 500, 502, 503, 504], // Timeout, Rate limit, Server errors
};

const API_BASE_URL = import.meta.env.VITE_API_URL;

/**
 * Sleep utility for retry delays
 */
const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Check if an error is retryable
 */
const isRetryable = (status: number, retryableStatuses: number[]): boolean => {
  return retryableStatuses.includes(status);
};

/**
 * Check if error is a network error (no response)
 */
const isNetworkError = (error: unknown): boolean => {
  return error instanceof TypeError && error.message.includes('fetch');
};

/**
 * Fetch with retry mechanism
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retryOptions: RetryOptions = {}
): Promise<Response> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...retryOptions };
  const { maxRetries, retryDelay, retryableStatuses } = opts;

  let lastError: unknown;
  let lastResponse: Response | null = null;

  for (let attempt = 0; attempt <= maxRetries!; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        signal: options.signal || (attempt > 0 ? undefined : options.signal), // Don't retry if aborted
      });

      // Success or non-retryable error
      if (response.ok || !isRetryable(response.status, retryableStatuses!)) {
        return response;
      }

      // Retryable error
      lastResponse = response;
      
      if (attempt < maxRetries!) {
        const delay = retryDelay! * Math.pow(2, attempt);
        if (import.meta.env.DEV) {
          console.warn(
            `API request failed (${response.status}), retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries})`
          );
        }
        await sleep(delay);
        continue;
      }
    } catch (error) {
      lastError = error;

      // Network error - retry if not aborted
      if (isNetworkError(error) && !(error instanceof Error && error.name === 'AbortError')) {
        if (attempt < maxRetries!) {
          const delay = retryDelay! * Math.pow(2, attempt);
          if (import.meta.env.DEV) {
            console.warn(
              `Network error, retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries})`
            );
          }
          await sleep(delay);
          continue;
        }
      }

      // Non-retryable error or max retries reached
      throw error;
    }
  }

  // If we have a response, return it even if it's an error
  if (lastResponse) {
    return lastResponse;
  }

  // If we have an error, throw it
  if (lastError) {
    throw lastError;
  }

  // Fallback (shouldn't happen)
  throw new Error('Request failed after retries');
}

/**
 * API client with automatic retry
 */
export const apiClient = {
  get: async (endpoint: string, options?: RequestInit, retryOptions?: RetryOptions) => {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
    return fetchWithRetry(url, { ...options, method: 'GET' }, retryOptions);
  },

  post: async (endpoint: string, body?: unknown, options?: RequestInit, retryOptions?: RetryOptions) => {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options?.headers,
    };

    return fetchWithRetry(
      url,
      {
        ...options,
        method: 'POST',
        headers,
        body: body ? JSON.stringify(body) : undefined,
      },
      retryOptions
    );
  },

  postFormData: async (endpoint: string, formData: FormData, options?: RequestInit, retryOptions?: RetryOptions) => {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
    
    return fetchWithRetry(
      url,
      {
        ...options,
        method: 'POST',
        body: formData,
        // Don't set Content-Type header, let browser set it with boundary
        headers: {
          ...options?.headers,
        },
      },
      retryOptions
    );
  },
};

export default apiClient;
