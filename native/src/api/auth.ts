import type { LoginRequest } from '@trek/shared';
import { apiClient } from './client';
import { setToken, clearToken } from './tokenStore';

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  role: string;
}

interface LoginResponse {
  token?: string;
  user?: AuthUser;
  mfa_required?: boolean;
  mfa_token?: string;
}

/**
 * Uses "remember me" by default: bearer callers get no sliding renewal
 * (server/src/nest/auth/session-renewal.interceptor.ts is cookie-only), so a
 * short-lived token would silently log the app out. This trades that for a
 * longer-lived token and a re-login prompt on 401 instead.
 */
export async function login(email: string, password: string): Promise<LoginResponse> {
  const body: LoginRequest = { email, password, remember_me: true };
  const { data } = await apiClient.post<LoginResponse>('/auth/login', body);
  if (data.token) await setToken(data.token);
  return data;
}

export async function logout(): Promise<void> {
  await clearToken();
  try {
    await apiClient.post('/auth/logout');
  } catch {
    // Best-effort: the token is already gone locally either way.
  }
}

export async function fetchWsToken(): Promise<string> {
  const { data } = await apiClient.post<{ token: string }>('/auth/ws-token');
  return data.token;
}
