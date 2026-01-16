import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../services/api';
import { User, LoginCredentials, AuthResponse } from '../types';
import toast from 'react-hot-toast';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Initialize auth state from localStorage
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');

      if (storedToken && storedUser) {
        try {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
          
          // Verify token is still valid
          const response = await authApi.getMe();
          if (response.data.success) {
            setUser(response.data.data);
            localStorage.setItem('user', JSON.stringify(response.data.data));
          }
        } catch {
          // Token invalid, clear storage
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setToken(null);
          setUser(null);
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = useCallback(async (credentials: LoginCredentials) => {
    try {
      const response = await authApi.login(credentials.email, credentials.password);
      
      if (response.data.success) {
        const { user: userData, token: authToken } = response.data.data as AuthResponse;
        
        setUser(userData);
        setToken(authToken);
        localStorage.setItem('token', authToken);
        localStorage.setItem('user', JSON.stringify(userData));
        
        toast.success(`Welcome back, ${userData.firstName}!`);
        navigate('/');
      }
    } catch {
      // Error handled by axios interceptor
    }
  }, [navigate]);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
    toast.success('Logged out successfully');
  }, [navigate]);

  const updateUser = useCallback((updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  }, []);

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: !!user && !!token,
    isLoading,
    login,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};



