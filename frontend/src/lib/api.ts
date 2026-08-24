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
 * Silently exchanges the httpOnly "remember me" refresh cookie (if any)
 * for a fresh 8h access token. Deduped so concurrent 401s from several
 * in-flight requests trigger exactly one refresh call, not one each.
 */
let refreshInFlight: Promise<boolean> | null = null;

function refreshAccessToken(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        });
        const data = await res.json().catch(() => ({}));
        if (data?.success && data?.data?.token) {
          localStorage.setItem('ipoms_token', data.data.token);
          if (data.data.user) localStorage.setItem('ipoms_user', JSON.stringify(data.data.user));
          return true;
        }
        return false;
      } catch {
        return false;
      } finally {
        refreshInFlight = null;
      }
    })();
  }
  return refreshInFlight;
}

/**
 * Enhanced fetch wrapper with automatic JWT authorization and 401 handling.
 */
export async function apiFetch<T = any>(
  endpoint: string,
  options: RequestInit = {},
  _isRetry = false
): Promise<{ success: boolean; data?: T; message?: string; error?: { code: string; message: string } }> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  const isAuthEndpoint = /\/auth\/(login|refresh|logout)$/.test(url);

  const headers = getAuthHeaders(options.headers || {});

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
    });

    const data = await response.json().catch(() => ({}));

    if (response.status === 401 && typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
      // A remembered device gets one silent retry via the refresh cookie
      // before we treat this as a real session expiry.
      if (!isAuthEndpoint && !_isRetry) {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
          return apiFetch<T>(endpoint, options, true);
        }
      }

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

/**
 * Fetch wrapper for downloading binary blobs (e.g. XLSX, PDF, CSV files).
 */
export async function apiFetchBlob(endpoint: string, options: RequestInit = {}): Promise<Blob> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  const token = typeof window !== 'undefined' ? localStorage.getItem('ipoms_token') : null;
  const headers: Record<string, string> = {};

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...(options.headers as Record<string, string>),
    },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Download failed with status: ${response.status}`);
  }

  return response.blob();
}

