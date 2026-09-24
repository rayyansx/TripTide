import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import * as authApi from '../api/auth';
import { setUnauthorizedHandler } from '../api/client';
import { getToken } from '../api/tokenStore';

interface AuthState {
  isAuthenticated: boolean;
  user: authApi.AuthUser | null;
  status: 'idle' | 'loading' | 'ready';
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  restore: () => Promise<void>;
}

/**
 * Same shape as client/src/store/authStore.ts's persisted "UI snapshot"
 * idea, but backed by AsyncStorage instead of the web's localStorage
 * default for Zustand's `persist` middleware. The actual token lives in
 * SecureStore (tokenStore.ts), never here.
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      user: null,
      status: 'idle',
      async login(email, password) {
        const result = await authApi.login(email, password);
        if (result.mfa_required) {
          throw new Error('MFA is not yet supported in the native app (Phase 3).');
        }
        set({ isAuthenticated: true, user: result.user ?? null, status: 'ready' });
      },
      async logout() {
        await authApi.logout();
        set({ isAuthenticated: false, user: null, status: 'ready' });
      },
      async restore() {
        set({ status: 'loading' });
        const token = await getToken();
        set({ isAuthenticated: Boolean(token), status: 'ready' });
      },
    }),
    {
      name: 'trek_auth_snapshot',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ isAuthenticated: state.isAuthenticated, user: state.user }),
    }
  )
);

setUnauthorizedHandler(() => {
  useAuthStore.setState({ isAuthenticated: false, user: null });
});
