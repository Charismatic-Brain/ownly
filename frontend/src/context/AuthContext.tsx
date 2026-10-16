import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, AuthResponse } from '../types';
import { apiClient, ApiRequestError } from '../lib/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  register: (data: { email: string; password: string; displayName: string }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// The session is an httpOnly cookie managed by the server; the browser never sees the token.
// Remove any token left in localStorage by earlier versions of the app.
const LEGACY_TOKEN_KEY = 'ownly_token';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    try {
      localStorage.removeItem(LEGACY_TOKEN_KEY);
    } catch {
      // storage may be unavailable (private mode); nothing to clean up
    }

    async function loadUser() {
      try {
        const userProfile = await apiClient<User>('/auth/me');
        setUser(userProfile);
      } catch (err) {
        // 401 simply means "not signed in" - anything else is worth surfacing
        if (!(err instanceof ApiRequestError && err.status === 401)) {
          console.error('Session verification failed:', err);
        }
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }

    loadUser();
  }, []);

  const login = async (credentials: { email: string; password: string }) => {
    const res = await apiClient<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    setUser(res.user);
  };

  const register = async (data: { email: string; password: string; displayName: string }) => {
    const res = await apiClient<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    setUser(res.user);
  };

  const logout = async () => {
    try {
      // Revokes the session server-side and clears the cookie
      await apiClient('/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout request failed:', err);
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
