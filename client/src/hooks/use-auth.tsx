import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { insertUserSchema, User as SelectUser, InsertUser } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type AuthContextType = {
  user: SelectUser | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<SelectUser, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<SelectUser, Error, InsertUser>;
};

type LoginData = Pick<InsertUser, "username" | "password">;

export const AuthContext = createContext<AuthContextType | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<SelectUser | undefined, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      console.log("[AUTH] Attempting login with:", credentials.username);
      const res = await apiRequest("POST", "/api/login", credentials);
      console.log("[AUTH] Login response status:", res.status);
      return await res.json();
    },
    onSuccess: (user: SelectUser) => {
      console.log("[AUTH] Login successful for user:", user.username);
      queryClient.setQueryData(["/api/user"], user);
    },
    onError: (error: Error) => {
      console.error("[AUTH] Login failed:", error.message);
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: InsertUser) => {
      console.log("[AUTH] Attempting registration for:", credentials.username);
      const res = await apiRequest("POST", "/api/register", credentials);
      console.log("[AUTH] Registration response status:", res.status);
      return await res.json();
    },
    onSuccess: (user: SelectUser) => {
      console.log("[AUTH] Registration successful for user:", user.username);
      queryClient.setQueryData(["/api/user"], user);
    },
    onError: (error: Error) => {
      console.error("[AUTH] Registration failed:", error.message);
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      console.log("[AUTH] Attempting logout");
      await apiRequest("POST", "/api/logout");
      console.log("[AUTH] Logout request completed");
    },
    onSuccess: () => {
      console.log("[AUTH] Logout successful");
      queryClient.setQueryData(["/api/user"], null);
    },
    onError: (error: Error) => {
      console.error("[AUTH] Logout failed:", error.message);
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
        user: user ?? null,
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

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}