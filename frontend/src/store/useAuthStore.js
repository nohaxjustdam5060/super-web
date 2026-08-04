import { create } from 'zustand';
import axiosClient from '../api/axiosClient';

export const useAuthStore = create((set, get) => ({
  user: JSON.parse(localStorage.getItem('super_user')) || null,
  accessToken: localStorage.getItem('super_access_token') || null,
  isAuthenticated: !!localStorage.getItem('super_access_token'),
  loading: false,

  login: async (email, password) => {
    set({ loading: true });
    try {
      const response = await axiosClient.post('/auth/login', { email, password });
      const { user, accessToken, refreshToken } = response.data;

      localStorage.setItem('super_access_token', accessToken);
      localStorage.setItem('super_refresh_token', refreshToken);
      localStorage.setItem('super_user', JSON.stringify(user));

      set({ user, accessToken, isAuthenticated: true, loading: false });
      return { success: true, user };
    } catch (error) {
      set({ loading: false });
      return {
        success: false,
        message: error.response?.data?.message || 'Error al iniciar sesión'
      };
    }
  },

  register: async (name, email, password, phone) => {
    set({ loading: true });
    try {
      const response = await axiosClient.post('/auth/register', { name, email, password, phone });
      const { user, accessToken, refreshToken } = response.data;

      localStorage.setItem('super_access_token', accessToken);
      localStorage.setItem('super_refresh_token', refreshToken);
      localStorage.setItem('super_user', JSON.stringify(user));

      set({ user, accessToken, isAuthenticated: true, loading: false });
      return { success: true, user };
    } catch (error) {
      set({ loading: false });
      return {
        success: false,
        message: error.response?.data?.message || 'Error al registrar usuario'
      };
    }
  },

  logout: () => {
    localStorage.removeItem('super_access_token');
    localStorage.removeItem('super_refresh_token');
    localStorage.removeItem('super_user');
    set({ user: null, accessToken: null, isAuthenticated: false });
  }
}));
