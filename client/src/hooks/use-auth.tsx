import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { z } from 'zod';
import { User } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Auth Data Types and Schemas
export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export const forgotPasswordSchema = z.object({
  username: z.string().min(1, "Username is required"),
  email: z.string().email("Invalid email address").min(1, "Email is required"),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(32, "Invalid reset token"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .max(100, "Password is too long"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Auth Context Types
type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<User, Error, z.infer<typeof loginSchema>>;
  logoutMutation: UseMutationResult<void, Error, void>;
  forgotPasswordMutation: UseMutationResult<{ message: string }, Error, z.infer<typeof forgotPasswordSchema>>;
  resetPasswordMutation: UseMutationResult<{ message: string }, Error, z.infer<typeof resetPasswordSchema>>;
  verifyResetToken: (token: string) => Promise<{ valid: boolean; message: string }>;
};

// Create the auth context
export const AuthContext = createContext<AuthContextType | null>(null);

// Auth Provider Component
export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  
  // Query to get current user
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<User | null, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: z.infer<typeof loginSchema>) => {
      const res = await apiRequest("POST", "/api/login", credentials);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Login failed");
      }
      return await res.json();
    },
    onSuccess: (user: User) => {
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Login successful",
        description: `Welcome, ${user.username}!`,
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

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/logout");
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Logout failed");
      }
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], null);
      toast({
        title: "Logout successful",
        description: "You have been logged out",
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

  // Forgot password mutation
  const forgotPasswordMutation = useMutation({
    mutationFn: async (data: z.infer<typeof forgotPasswordSchema>) => {
      const res = await apiRequest("POST", "/api/forgot-password", data);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to process request");
      }
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Password reset email sent",
        description: data.message || "If your account exists, a password reset link has been sent to your email",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Request failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async (data: z.infer<typeof resetPasswordSchema>) => {
      const res = await apiRequest("POST", "/api/reset-password", {
        token: data.token,
        password: data.password,
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to reset password");
      }
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Password reset successful",
        description: data.message || "Your password has been updated. You can now log in with your new password.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Password reset failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Verify reset token function
  const verifyResetToken = async (token: string): Promise<{ valid: boolean; message: string }> => {
    try {
      const res = await apiRequest("POST", "/api/verify-reset-token", { token });
      if (!res.ok) {
        const errorData = await res.json();
        return { valid: false, message: errorData.message || "Failed to verify token" };
      }
      return await res.json();
    } catch (error) {
      return { valid: false, message: "An error occurred while verifying the token" };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user: user || null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        forgotPasswordMutation,
        resetPasswordMutation,
        verifyResetToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}