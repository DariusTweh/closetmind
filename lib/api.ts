import { supabase } from './supabase';

function resolveApiBaseUrl() {
  const raw = String(process.env.EXPO_PUBLIC_API_BASE_URL || '').trim();
  if (!raw) {
    throw new Error('Missing EXPO_PUBLIC_API_BASE_URL');
  }

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error('EXPO_PUBLIC_API_BASE_URL must be a valid http(s) URL');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('EXPO_PUBLIC_API_BASE_URL must use http or https');
  }

  return raw.replace(/\/+$/, '');
}

export const API_BASE_URL = resolveApiBaseUrl();

export function apiUrl(path: string) {
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getAccessToken() {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw new Error(error.message);
  }

  const token = data.session?.access_token;
  if (!token) {
    throw new Error('You must be logged in.');
  }

  return token;
}

export async function apiPost(path: string, payload?: unknown, init: RequestInit = {}) {
  const token = await getAccessToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> | undefined),
    Authorization: `Bearer ${token}`,
  };

  return fetch(apiUrl(path), {
    ...init,
    method: init.method ?? 'POST',
    headers,
    body: payload === undefined ? init.body : JSON.stringify(payload),
  });
}

export function getRetryAfterMs(response: Response, fallbackMs = 1500) {
  const rawValue = String(response.headers.get('retry-after') || '').trim();
  if (!rawValue) return Math.max(1000, fallbackMs);

  const numericSeconds = Number(rawValue);
  if (Number.isFinite(numericSeconds) && numericSeconds >= 0) {
    return Math.max(1000, numericSeconds * 1000);
  }

  const retryAt = new Date(rawValue).getTime();
  if (Number.isFinite(retryAt)) {
    return Math.max(1000, retryAt - Date.now());
  }

  return Math.max(1000, fallbackMs);
}

export function isRateLimitedResponse(response: Response, payload?: any) {
  if (response.status === 429) return true;

  const message = String(payload?.error || payload?.message || payload?.rawText || '')
    .trim()
    .toLowerCase();
  return (
    message.includes('too many requests') ||
    message.includes('rate limit') ||
    message.includes('rate-limit') ||
    message.includes('rate limited') ||
    message.includes('rate-limited')
  );
}

export async function apiPostWithRateLimitRetry<T = any>(
  path: string,
  payload?: unknown,
  options: {
    init?: RequestInit;
    maxAttempts?: number;
    fallbackMs?: number;
    onRetry?: (args: {
      attempt: number;
      maxAttempts: number;
      delayMs: number;
      response: Response;
      payload: T | { error?: string; rawText?: string };
    }) => void | Promise<void>;
  } = {},
) {
  const maxAttempts = Math.max(1, Number(options.maxAttempts || 1));
  const fallbackMs = Math.max(1000, Number(options.fallbackMs || 1500));

  let response = await apiPost(path, payload, options.init);
  let data = await readApiResponse<T>(response);

  for (let attempt = 1; attempt < maxAttempts && isRateLimitedResponse(response, data); attempt += 1) {
    const delayMs = getRetryAfterMs(response, fallbackMs);
    if (options.onRetry) {
      await options.onRetry({
        attempt,
        maxAttempts,
        delayMs,
        response,
        payload: data,
      });
    }
    await delay(delayMs);
    response = await apiPost(path, payload, options.init);
    data = await readApiResponse<T>(response);
  }

  return {
    response,
    data,
  };
}

export async function readApiResponse<T = any>(response: Response): Promise<T | { error?: string; rawText?: string }> {
  const rawText = await response.text();
  if (!rawText) {
    return {} as T;
  }

  try {
    return JSON.parse(rawText) as T;
  } catch {
    return {
      error: rawText.trim() || `Request failed with status ${response.status}`,
      rawText,
    };
  }
}
