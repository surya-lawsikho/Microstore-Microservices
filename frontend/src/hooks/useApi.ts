import { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/api';
import toast from 'react-hot-toast';

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface UseApiOptions {
  immediate?: boolean;
  retryCount?: number;
  retryDelay?: number;
}

export function useApi<T>(
  apiCall: () => Promise<T>,
  options: UseApiOptions = {}
) {
  const { immediate = true, retryCount = 3, retryDelay = 1000 } = options;
  
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(async (retryAttempt = 0): Promise<T | null> => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const result = await apiCall();
      setState({ data: result, loading: false, error: null });
      return result;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'An error occurred';
      
      if (retryAttempt < retryCount) {
        // Retry with exponential backoff
        const delay = retryDelay * Math.pow(2, retryAttempt);
        setTimeout(() => {
          execute(retryAttempt + 1);
        }, delay);
        return null;
      }
      
      setState({ data: null, loading: false, error: errorMessage });
      toast.error(errorMessage);
      return null;
    }
  }, [apiCall, retryCount, retryDelay]);

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [immediate, execute]);

  return {
    ...state,
    execute,
    reset,
  };
}

// Specific hooks for different API calls
export function useProducts() {
  return useApi(() => apiService.getProducts());
}

export function useProduct(id: string) {
  return useApi(() => apiService.getProduct(id), { immediate: !!id });
}

export function useOrders() {
  return useApi(() => apiService.getUserOrders());
}

export function useHealthCheck() {
  return useApi(() => apiService.healthCheck());
}
