import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh-token`, {
            refreshToken
          });

          if (response.data.success) {
            const { accessToken, refreshToken: newRefreshToken } = response.data.data;
            localStorage.setItem('accessToken', accessToken);
            localStorage.setItem('refreshToken', newRefreshToken);

            // Retry original request with new token
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            return api(originalRequest);
          }
        }
      } catch (refreshError) {
        // Refresh failed, redirect to login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (userData) => api.post('/auth/register', userData),
  login: (credentials) => api.post('/auth/login', credentials),
  logout: (data) => api.post('/auth/logout', data),
  refreshToken: (data) => api.post('/auth/refresh-token', data),
  verifyOTP: (otpData) => api.post('/auth/verify-otp', otpData),
  resendOTP: (data) => api.post('/auth/resend-otp', data),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  resetPassword: (data) => api.post('/auth/reset-password', data),
};

// User API
export const userAPI = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (data) => api.put('/users/profile', data),
  changePassword: (data) => api.post('/users/change-password', data),
  getStats: () => api.get('/users/stats'),
  getPreferences: () => api.get('/users/preferences'),
  updatePreferences: (data) => api.put('/users/preferences', data),
};

// Appliance API
export const applianceAPI = {
  getAll: () => api.get('/appliances'),
  create: (data) => api.post('/appliances', data),
  update: (id, data) => api.put(`/appliances/${id}`, data),
  delete: (id) => api.delete(`/appliances/${id}`),
};

// Analytics API
export const analyticsAPI = {
  getTrends: (params) => api.get('/analytics/trends', { params }),
  getPeakHours: (params) => api.get('/analytics/peak-hours', { params }),
  getComparisons: (params) => api.get('/analytics/comparisons', { params }),
};

// Dashboard API
export const dashboardAPI = {
  getData: () => api.get('/dashboard'),
};

// Consumption API
export const consumptionAPI = {
  submit: (data) => api.post('/consumption', data),
  getHistory: (params) => api.get('/consumption/history', { params }),
  getCurrent: () => api.get('/consumption/current'),
  getPredictions: () => api.get('/consumption/predictions'),
  update: (id, data) => api.put(`/consumption/${id}`, data),
  delete: (id) => api.delete(`/consumption/${id}`),
};

// Admin API
export const adminAPI = {
  getOverview: () => api.get('/admin/overview'),
  getUsers: (params) => api.get('/admin/users', { params }),
  getUserDetails: (userId) => api.get(`/admin/users/${userId}`),
  toggleUserStatus: (userId) => api.patch(`/admin/users/${userId}/toggle-status`),
  deleteUser: (userId) => api.delete(`/admin/users/${userId}`),
  getAnalytics: (params) => api.get('/admin/analytics', { params }),
  getPredictions: () => api.get('/admin/predictions'),
  getPeakUsage: () => api.get('/admin/peak-usage'),
  getCurrentTariff: () => api.get('/admin/tariff'),
  updateTariff: (data) => api.post('/admin/tariff', data),
};

export default api;