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
