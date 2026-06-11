import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = window.localStorage.getItem('sew_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Centralized error normalization so every screen can show a consistent,
// human-readable message instead of a raw axios/network error shape.
export function getErrorMessage(error) {
  if (error?.response?.data?.error) return error.response.data.error;
  if (error?.response?.data?.message) return error.response.data.message;
  if (error?.response?.status === 401) return 'Your session has expired. Please sign in again.';
  if (error?.message === 'Network Error') {
    return "Can't reach the server. Check that the API is running and try again.";
  }
  return error?.message || 'Something went wrong. Please try again.';
}

export default api;
