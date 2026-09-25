import axios from 'axios';
import NetInfo from '@react-native-community/netinfo';
import { API_BASE_URL } from '../config';
import { getSocketId } from './socketId';
import { getToken, clearToken } from './tokenStore';
import { queueMutation } from '../db/mutationQueue';

/**
 * Mirrors client/src/api/client.ts's interceptor shape (bearer auth instead
 * of the web's httpOnly cookie, X-Socket-Id kept identical) so the two
 * clients stay behaviorally compatible with the same server contract.
 */
export const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 8000,
  headers: { 'Content-Type': 'application/json' },
});

let onUnauthorized: (() => void) | undefined;

/** Registered once by authStore so a 401 anywhere can drop back to the login screen. */
export function setUnauthorizedHandler(handler: () => void): void {
  onUnauthorized = handler;
}

apiClient.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  const socketId = getSocketId();
  if (socketId) config.headers['X-Socket-Id'] = socketId;

  // Intercept mutations (POST/PUT/DELETE/PATCH) when offline
  if (['post', 'put', 'delete', 'patch'].includes(config.method?.toLowerCase() || '')) {
    const state = await NetInfo.fetch();
    if (!state.isConnected) {
      // Determine tripId if possible from URL
      let tripId: number | undefined;
      const tripMatch = config.url?.match(/\/trips\/(\d+)/);
      if (tripMatch) {
        tripId = parseInt(tripMatch[1], 10);
      }

      const id = await queueMutation(tripId, {
        method: config.method?.toLowerCase() as 'post' | 'put' | 'delete' | 'patch',
        url: config.url || '',
        body: config.data,
        headers: config.headers as Record<string, string>,
      });

      // Reject the request gracefully so the caller knows it was queued offline
      throw new axios.Cancel(`OFFLINE_QUEUED:${id}`);
    }
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error?.response?.status === 401) {
      await clearToken();
      onUnauthorized?.();
    }
    return Promise.reject(error);
  }
);

/**
 * Uploads use RN's `{ uri, name, type }` FormData part shape instead of a
 * web File/Blob; the server reads the same fixed field names either way
 * (server's FileInterceptor('file'|'avatar'|'cover'|'image'|'backup')).
 * timeout: 0 mirrors the web client exempting uploads from the default
 * 8s timeout — mobile networks make large uploads slow.
 */
export async function postMultipart<T>(url: string, formData: FormData): Promise<T> {
  const response = await apiClient.post<T>(url, formData, {
    timeout: 0,
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}
