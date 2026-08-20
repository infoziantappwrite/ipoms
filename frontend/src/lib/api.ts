/**
 * iPOMS Frontend API Client.
 *
 * Automatically injects JWT Bearer token from localStorage into all outbound requests.
 */

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

/**
 * Returns standard authentication headers with Bearer token if present.
 */
export function getAuthHeaders(customHeaders: HeadersInit = {}): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('ipoms_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  return {
    ...headers,
    ...(customHeaders as Record<string, string>),
  };
}

/**
 * Enhanced fetch wrapper with automatic JWT authorization and 401 handling.
 */
export async function apiFetch<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data?: T; message?: string; error?: { code: string; message: string } }> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  const headers = getAuthHeaders(options.headers || {});

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json().catch(() => ({}));

    // If session expired or unauthorized on protected route, clear storage and bounce to login
    if (response.status === 401 && typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
      console.warn('[apiClient] 401 Unauthorized — Session expired or token invalid.');
      localStorage.removeItem('ipoms_token');
      localStorage.removeItem('ipoms_user');
      window.location.href = '/login?expired=1';
    }

    if (!response.ok && !data.error) {
      return {
        success: false,
        error: {
          code: `HTTP_${response.status}`,
          message: data.message || `Request failed with status ${response.status}`,
        },
      };
    }

    return data;
  } catch (err: any) {
    console.error(`[apiClient] Network error on ${url}:`, err);
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: 'Cannot reach the server. Please check your network connection.',
      },
    };
  }
}
