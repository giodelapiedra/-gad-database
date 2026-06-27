import { createContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import type { User, ApiResponse } from '@/types';
import api from '@/lib/axios';
import { toastInfo } from '@/lib/toast';
import { getCookie, setCookie, removeCookie } from '@/lib/cookies';

interface AuthContextValue {
  user: User | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const token = getCookie('gad_token');
    const savedUser = getCookie('gad_user');

    if (token && savedUser) {
      try {
        const parsed = JSON.parse(savedUser) as User;
        setUser(parsed);

        api.get<ApiResponse<User>>('/auth/me')
          .then((res) => {
            setUser(res.data.data);
            setCookie('gad_user', JSON.stringify(res.data.data));
          })
          .catch(() => {
            removeCookie('gad_token');
            removeCookie('gad_user');
            setUser(null);
          })
          .finally(() => setIsLoading(false));
      } catch {
        removeCookie('gad_token');
        removeCookie('gad_user');
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback((token: string, userData: User) => {
    setCookie('gad_token', token);
    setCookie('gad_user', JSON.stringify(userData));
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    removeCookie('gad_token');
    removeCookie('gad_user');
    setUser(null);
    toastInfo('Signed out successfully');
    navigate('/login');
  }, [navigate]);

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isAuthenticated: !!user,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
