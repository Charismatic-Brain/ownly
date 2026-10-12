import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, AuthResponse } from '../types';
import { apiClient } from '../lib/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  register: (data: { email: string; password: string; displayName: string }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('ownly_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadUser() {
      const storedToken = localStorage.getItem('ownly_token');
      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      try {
        const userProfile = await apiClient<User>('/auth/me');
        setUser(userProfile);
      } catch (err) {
        console.error('Session verification failed, logging out:', err);
        localStorage.removeItem('ownly_token');
        setToken(null);
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
    localStorage.setItem('ownly_token', res.accessToken);
    setToken(res.accessToken);
    setUser(res.user);
  };

  const register = async (data: { email: string; password: string; displayName: string }) => {
    const res = await apiClient<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    localStorage.setItem('ownly_token', res.accessToken);
    setToken(res.accessToken);
    setUser(res.user);
  };

  const logout = () => {
    // Attempt backend logout notification asynchronously
    apiClient('/auth/logout', { method: 'POST' }).catch(() => {});
    localStorage.removeItem('ownly_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout }}>
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
