import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('jhp_token'));
  const [loading, setLoading] = useState(true);

  const applyToken = useCallback((t) => {
    if (t) {
      localStorage.setItem('jhp_token', t);
      axios.defaults.headers.common['Authorization'] = `Bearer ${t}`;
    } else {
      localStorage.removeItem('jhp_token');
      delete axios.defaults.headers.common['Authorization'];
    }
    setToken(t);
  }, []);

  // Load user on mount if token exists
  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    axios.get(`${BACKEND_URL}/api/auth/me`)
      .then(res => setUser(res.data))
      .catch(() => {
        applyToken(null);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, [token, applyToken]);

  // Handle OAuth redirect: token can arrive as URL fragment (#token=...) or legacy query param (?token=...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    const oauthToken = hashParams.get('token') || params.get('token');
    const upgraded = params.get('upgraded');
    if (oauthToken) {
      applyToken(oauthToken);
      window.history.replaceState({}, '', window.location.pathname);
    }
    if (upgraded === 'true') {
      window.history.replaceState({}, '', window.location.pathname);
      if (token || oauthToken) {
        axios.get(`${BACKEND_URL}/api/auth/me`).then(res => setUser(res.data)).catch(() => {});
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const register = async (email, password, name) => {
    const res = await axios.post(`${BACKEND_URL}/api/auth/register`, { email, password, name });
    applyToken(res.data.token);
    setUser(res.data.user);
    return res.data;
  };

  const login = async (email, password) => {
    const res = await axios.post(`${BACKEND_URL}/api/auth/login`, { email, password });
    applyToken(res.data.token);
    setUser(res.data.user);
    return res.data;
  };

  const logout = () => {
    applyToken(null);
    setUser(null);
  };

  const loginWithGoogle = () => {
    window.location.href = `${BACKEND_URL}/api/auth/google`;
  };

  const refreshUser = async () => {
    if (!token) return;
    const res = await axios.get(`${BACKEND_URL}/api/auth/me`);
    setUser(res.data);
    return res.data;
  };

  const acceptAgreement = async () => {
    await axios.post(`${BACKEND_URL}/api/auth/accept-agreement`);
    // Update local user state so has_agreed reflects immediately
    setUser(prev => prev ? { ...prev, has_agreed: true } : prev);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, register, login, logout, loginWithGoogle, refreshUser, acceptAgreement }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
