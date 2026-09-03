/**
 * iPOMS Frontend API Client.
 *
 * Automatically injects JWT Bearer token from localStorage into all outbound requests.
 */

/**
 * Dynamically resolves the appropriate API base URL, ensuring that if the
 * frontend is accessed over HTTPS, the API base uses HTTPS to prevent
 * browser Mixed Content blocks and Authorization header-stripping redirects.
 */
export function getApiBase(): string {
  let base = process.env.NEXT_PUBLIC_API_URL;
  if (base) {
    if (typeof window !== 'undefined' && window.location.protocol === 'https:' && base.startsWith('http://')) {
      base = base.replace(/^http:\/\//, 'https://');
    }
    return base;
  }

  if (typeof window !== 'undefined') {
    const isHttps = window.location.protocol === 'https:';
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return `${isHttps ? 'https' : 'http'}://${host}:5000/api/v1`;
    }
    return `${window.location.origin}/api/v1`;
  }

  return 'http://localhost:5000/api/v1';
}

export const API_BASE = getApiBase();

/**
 * Returns standard authentication headers with Bearer token if present.
 */
export function getAuthHeaders(customHeaders: HeadersInit = {}): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('ipoms_token') || sessionStorage.getItem('ipoms_token');
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
        const base = getApiBase();
        const res = await fetch(`${base}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        });
        const data = await res.json().catch(() => ({}));
        if (data?.success && data?.data?.token) {
          localStorage.setItem('ipoms_token', data.data.token);
          sessionStorage.setItem('ipoms_token', data.data.token);
          if (data.data.user) {
            const raw = JSON.stringify(data.data.user);
            localStorage.setItem('ipoms_user', raw);
            sessionStorage.setItem('ipoms_user', raw);
          }
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
  const base = getApiBase();
  const url = endpoint.startsWith('http') ? endpoint : `${base}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
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
      // Check if user just logged in within the last 20 seconds (post-login grace window)
      // to prevent premature logouts from transient network or protocol handshakes.
      let isRecentLogin = false;
      try {
        const loginTime = sessionStorage.getItem('ipoms_login_time');
        if (loginTime && Date.now() - parseInt(loginTime, 10) < 20000) {
          isRecentLogin = true;
        }
      } catch {}

      // A remembered device gets one silent retry via the refresh cookie
      if (!isAuthEndpoint && !_isRetry) {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
          return apiFetch<T>(endpoint, options, true);
        }
      }

      if (!isRecentLogin) {
        console.warn('[apiClient] 401 Unauthorized — Session expired or token invalid.');
        localStorage.removeItem('ipoms_token');
        localStorage.removeItem('ipoms_user');
        window.location.href = '/login?expired=1';
      } else {
        console.warn('[apiClient] 401 received during initial post-login window on', url, 'Retaining session.');
      }
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

