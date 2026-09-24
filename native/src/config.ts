import { Platform } from 'react-native';

/**
 * The web client resolves `/api` against the browser's own origin (or Vite's
 * dev proxy). React Native has no origin to be relative to, so this needs an
 * absolute base URL. Override with EXPO_PUBLIC_API_BASE_URL for a real
 * deployment or a LAN IP when testing on a physical device — the Android
 * emulator's loopback to the host machine is 10.0.2.2, not localhost.
 */
function defaultApiBaseUrl(): string {
  if (Platform.OS === 'android') return 'http://10.0.2.2:3001';
  return 'http://localhost:3001';
}

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? defaultApiBaseUrl();

export const WS_BASE_URL = API_BASE_URL.replace(/^http/, 'ws');
