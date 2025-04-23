import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Cookies from 'js-cookie';
import * as jwtDecode from 'jwt-decode';

export const setAuthToken = (token: string) => {
  Cookies.set('token', token, { expires: 1 }); // 存儲 JWT token 到 cookie，有效期 1 天
};

export const getAuthToken = () => {
  return Cookies.get('token'); // 從 cookie 獲取 JWT token
};

export const clearAuthToken = () => {
  Cookies.remove('token'); // 從 cookie 移除 JWT token
};

export const isAuthenticated = () => {
  const token = Cookies.get('token');
  console.log('JWT Token:', token);
  return !!getAuthToken();
};

export const getDecodedToken = () => {
  const token = getAuthToken();
  if (!token) return null;

  try {
    return jwtDecode(token); // 解析 JWT 並返回內容
  } catch (err) {
    console.error('無法解析 JWT:', err);
    return null;
  }
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
