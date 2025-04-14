/**
 * Authentication Hook (Refactored)
 * 
 * Provides authentication context and user management functionality
 * using the centralized API services
 */
import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
  UseMutationResult,
} from "@tanstack/react-query";
import { User } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import * as userService from '@/services/api/userService';

// Define authentication-related types
export const loginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export type LoginData = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
  firstName: z.string().optional().default(""),
  lastName: z.string().optional().default(""),
  email: z.string().email("Please enter a valid email").optional().default(""),
  company: z.string().optional().default(""),
  inviteToken: z.string().optional().default(""),
})
.refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export type RegisterData = z.infer<typeof registerSchema>;
export type NullableString = string | null | undefined;

// Define authentication context type
type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<User, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<User, Error, RegisterData>;
};

// Create context
export const AuthContext = createContext<AuthContextType | null>(null);

// Query keys
export const authKeys = {
  me: ['/api/me'] as const,
  users: ['/api/users'] as const
};

/**
 * Authentication Provider Component
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Query for current user
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<User | null>({
    queryKey: authKeys.me,
    queryFn: () => userService.getCurrentUser(),
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: (credentials: LoginData) => userService.loginUser(credentials),
    onSuccess: (user: User) => {
      queryClient.setQueryData(authKeys.me, user);
      toast({
        title: "Login successful",
        description: `Welcome back, ${user.firstName || user.username}!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message || "Invalid username or password",
        variant: "destructive",
      });
    },
  });

  // Registration mutation
  const registerMutation = useMutation({
    mutationFn: (userData: RegisterData) => userService.registerUser(userData),
    onSuccess: (user: User) => {
      queryClient.setQueryData(authKeys.me, user);
      toast({
        title: "Registration successful",
        description: `Welcome, ${user.firstName || user.username}!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message || "Could not create your account",
        variant: "destructive",
      });
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: () => userService.logoutUser(),
    onSuccess: () => {
      queryClient.setQueryData(authKeys.me, null);
      toast({
        title: "Logged out successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user || null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Authentication Hook
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}