import axios, { AxiosInstance, AxiosResponse } from 'axios';
import toast from 'react-hot-toast';

// API Configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling and retries
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 errors (unauthorized)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      toast.error('Session expired. Please login again.');
      return Promise.reject(error);
    }

    // Handle network errors with retry logic
    if (!error.response && !originalRequest._retry) {
      originalRequest._retry = true;
      originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;
      
      if (originalRequest._retryCount <= 3) {
        const delay = Math.pow(2, originalRequest._retryCount) * 1000; // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
        return api(originalRequest);
      }
    }

    // Show user-friendly error messages
    const errorMessage = error.response?.data?.error || error.message || 'An error occurred';
    toast.error(errorMessage);

    return Promise.reject(error);
  }
);

// API Service Types
export interface User {
  id: string;
  username: string;
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  productId: string;
  qty: number;
  priceAtPurchase: number;
}

export interface Order {
  id: string;
  userId: string;
  items: OrderItem[];
  total: number;
  createdAt: string;
  updatedAt: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
}

export interface CreateOrderRequest {
  items: Array<{
    productId: string;
    qty: number;
  }>;
}

// API Service Class
class ApiService {
  // Auth endpoints
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await api.post('/api/users/login', credentials);
    return response.data;
  }

  async register(userData: RegisterRequest): Promise<User> {
    const response = await api.post('/api/users/register', userData);
    return response.data;
  }

  async getCurrentUser(): Promise<User> {
    const response = await api.get('/api/users/me');
    return response.data;
  }

  // Product endpoints
  async getProducts(): Promise<Product[]> {
    const response = await api.get('/api/products');
    return response.data;
  }

  async getProduct(id: string): Promise<Product> {
    const response = await api.get(`/api/products/${id}`);
    return response.data;
  }

  async createProduct(product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product> {
    const response = await api.post('/api/products', product);
    return response.data;
  }

  async updateProduct(id: string, product: Partial<Product>): Promise<Product> {
    const response = await api.put(`/api/products/${id}`, product);
    return response.data;
  }

  async deleteProduct(id: string): Promise<void> {
    await api.delete(`/api/products/${id}`);
  }

  // Order endpoints
  async createOrder(orderData: CreateOrderRequest): Promise<Order> {
    const response = await api.post('/api/orders', orderData);
    return response.data;
  }

  async getUserOrders(): Promise<Order[]> {
    const response = await api.get('/api/orders');
    return response.data;
  }

  // Health check
  async healthCheck(): Promise<{ ok: boolean; service: string }> {
    const response = await api.get('/health');
    return response.data;
  }
}

export const apiService = new ApiService();
export default api;
