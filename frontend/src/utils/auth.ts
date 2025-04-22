import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export const setAuthToken = (token: string) => {
  localStorage.setItem('token', token);
};

export const getAuthToken = () => {
  return localStorage.getItem('token');
};

export const clearAuthToken = () => {
  localStorage.removeItem('token');
};

export const isAuthenticated = () => {
  return !!getAuthToken();
};

// Hook for protected routes - simplified version
export const useRequireAuth = (isProtected: boolean = true) => {
  const navigate = useNavigate();
  
  useEffect(() => {
    if (isProtected && !isAuthenticated()) {
      clearAuthToken();
      navigate('/signin');
    }
  }, [navigate, isProtected]);
};

export const handleVirtualTAClick = (navigate: any) => {
  if (isAuthenticated()) {
    navigate('/second');
  } else {
    navigate('/signin');
  }
};
