import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { 
  loginUser, 
  registerUser, 
  loadUser, 
  logoutUser, 
  clearError 
} from '../store/slices/authSlice';
import { LoginRequest, RegisterRequest } from '../services/api';

export function useAuth() {
  const dispatch = useDispatch<AppDispatch>();
  const { user, accessToken, isAuthenticated, loading, error } = useSelector(
    (state: RootState) => state.auth
  );

  // Load user on mount if token exists
  useEffect(() => {
    if (accessToken && !user) {
      dispatch(loadUser());
    }
  }, [accessToken, user, dispatch]);

  const login = async (credentials: LoginRequest) => {
    return dispatch(loginUser(credentials));
  };

  const register = async (userData: RegisterRequest) => {
    return dispatch(registerUser(userData));
  };

  const logout = () => {
    dispatch(logoutUser());
  };

  const clearAuthError = () => {
    dispatch(clearError());
  };

  return {
    user,
    accessToken,
    isAuthenticated,
    loading,
    error,
    login,
    register,
    logout,
    clearError: clearAuthError,
  };
}
