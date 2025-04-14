/**
 * User API Service
 * 
 * Handles all API requests related to user authentication and management
 */
import { get, post, patch, del } from './apiClient';
import { User } from '@shared/schema';
import { LoginData, RegisterData } from '@/hooks/use-auth';

const BASE_URL = '/api';

/**
 * Get current user profile
 */
export const getCurrentUser = (): Promise<User | null> => {
  return get<User | null>(`${BASE_URL}/me`, {
    // Handle 401 gracefully without throwing
    headers: {
      'Accept-Error-401': 'true'
    }
  }).catch(err => {
    if (err.message.startsWith('401:')) {
      return null;
    }
    throw err;
  });
};

/**
 * Log in a user
 */
export const loginUser = (credentials: LoginData): Promise<User> => {
  return post<User, LoginData>(`${BASE_URL}/login`, credentials);
};

/**
 * Register a new user
 */
export const registerUser = (userData: RegisterData): Promise<User> => {
  // Remove confirmPassword before sending
  const { confirmPassword, ...registrationData } = userData;
  return post<User>(
    `${BASE_URL}/register`, 
    registrationData
  );
};

/**
 * Log out the current user
 */
export const logoutUser = (): Promise<void> => {
  return post<void>(`${BASE_URL}/logout`);
};

/**
 * Update user profile
 */
export const updateUserProfile = (userId: number, profileData: Partial<User>): Promise<User> => {
  return patch<User, Partial<User>>(`${BASE_URL}/users/${userId}`, profileData);
};

/**
 * Get all users (admin only)
 */
export const getAllUsers = (): Promise<User[]> => {
  return get<User[]>(`${BASE_URL}/users`);
};