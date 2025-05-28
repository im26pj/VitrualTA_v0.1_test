import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Cookies from 'js-cookie';
import { jwtDecode } from 'jwt-decode';

export const setAuthToken = (token: string) => {
  console.log('==== Setting Auth Token ====');
  console.log('Raw Token:', token);
  
  try {
    const decodedToken = jwtDecode(token);
    console.log('Decoded Token Data:', decodedToken);
  } catch (err) {
    console.error('Token Decode Error:', err);
  }
  
  Cookies.set('token', token, { expires: 1 });
  console.log('Token saved to cookies with 1 day expiration');
  console.log('========================');
};

export const getAuthToken = () => {
  const token = Cookies.get('token');
  console.log('==== Getting Auth Token ====');
  console.log('Retrieved Token:', token);
  console.log('========================');
  return token;
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
    return jwtDecode(token); // Now using the correctly imported function
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
