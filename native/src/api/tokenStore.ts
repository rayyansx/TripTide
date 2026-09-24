import * as SecureStore from 'expo-secure-store';

/**
 * The web client never touches the JWT directly — it rides in an httpOnly
 * cookie. React Native's networking has no shared cookie jar with a browser,
 * so the mobile app uses the bearer fallback the server already supports
 * (server/src/nest/auth/jwt-verify.ts) and keeps the token in the platform
 * keychain/keystore via SecureStore instead.
 */
const TOKEN_KEY = 'trek_auth_token';

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}
