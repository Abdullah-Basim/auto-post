import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) { setLoading(false); return; }
    try {
      const { data } = await axios.get(`${API}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(data);
    } catch {
      localStorage.removeItem('token');
    }
    setLoading(false);
  }

  async function login(email, password) {
    const { data } = await axios.post(`${API}/api/auth/login`, { email, password }, { withCredentials: true });
    localStorage.setItem('token', data.token);
    setUser(data);
    return data;
  }

  async function register(email, password, name) {
    const { data } = await axios.post(`${API}/api/auth/register`, { email, password, name }, { withCredentials: true });
    localStorage.setItem('token', data.token);
    setUser(data);
    return data;
  }

  function logout() {
    localStorage.removeItem('token');
    setUser(null);
    axios.post(`${API}/api/auth/logout`, {}, { withCredentials: true });
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
