import React, { useState, useEffect } from "react";
import { useAuth, loginSchema, forgotPasswordSchema, resetPasswordSchema } from "@/hooks/use-auth";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { TabsContent, Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, AlertCircle } from "lucide-react";

// Main Auth Page Component
export default function AuthPage() {
  const [location, navigate] = useLocation();
  const { user, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("login");
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [tokenValid, setTokenValid] = useState<boolean>(false);
  const [tokenError, setTokenError] = useState<string | null>(null);

  // Check for reset token in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    
    if (token) {
      setResetToken(token);
      setActiveTab("reset-password");
      validateToken(token);
    }
  }, []);

  // Redirect if user is already logged in
  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  // Validate reset token
  const { verifyResetToken } = useAuth();
  
  const validateToken = async (token: string) => {
    try {
      const result = await verifyResetToken(token);
      setTokenValid(result.valid);
      if (!result.valid) {
        setTokenError(result.message);
      }
    } catch (error) {
      setTokenValid(false);
      setTokenError("Failed to validate token");
    }
  };

  // If still checking authentication status, show loading
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-muted/40">
      {/* Auth Forms Container */}
      <div className="flex flex-col items-center justify-center w-full md:w-1/2 p-8">
        <div className="w-full max-w-md">
          <h1 className="text-3xl font-bold mb-6 text-center">
            Glossa Requirements Toolkit
          </h1>

          <Tabs
            defaultValue="login"
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="grid grid-cols-2 mb-8">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="forgot-password">Forgot Password</TabsTrigger>
            </TabsList>

            {/* Login Form */}
            <TabsContent value="login">
              <LoginForm />
            </TabsContent>

            {/* Forgot Password Form */}
            <TabsContent value="forgot-password">
              <ForgotPasswordForm onSuccess={() => {}} />
            </TabsContent>

            {/* Reset Password Form (hidden tab, only shown when token is present) */}
            <TabsContent value="reset-password">
              {resetToken && (
                <>
                  {tokenError && (
                    <Alert variant="destructive" className="mb-4">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Invalid or expired token</AlertTitle>
                      <AlertDescription>{tokenError}</AlertDescription>
                    </Alert>
                  )}
                  
                  {tokenValid && (
                    <ResetPasswordForm token={resetToken} onSuccess={() => {
                      setActiveTab("login");
                      setResetToken(null);
                      // Remove token from URL without page refresh
                      window.history.pushState({}, document.title, window.location.pathname);
                    }} />
                  )}
                </>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Hero Section */}
      <div className="hidden md:flex md:w-1/2 bg-primary p-8 text-primary-foreground flex-col justify-center">
        <div className="max-w-md mx-auto">
          <h2 className="text-3xl font-bold mb-6">
            AI-Powered Requirements Management
          </h2>
          <p className="text-lg mb-4">
            Streamline your project requirements with our intelligent tools for
            requirement extraction, contradiction detection, and implementation
            planning.
          </p>
          <ul className="space-y-2 mb-8">
            <li className="flex items-center">
              <span className="mr-2">✓</span> Automatic requirement extraction from documents
            </li>
            <li className="flex items-center">
              <span className="mr-2">✓</span> Contradiction detection with AI
            </li>
            <li className="flex items-center">
              <span className="mr-2">✓</span> Implementation task generation
            </li>
            <li className="flex items-center">
              <span className="mr-2">✓</span> Document generation and workflow tools
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

// Login Form Component
function LoginForm() {
  const { loginMutation } = useAuth();
  const [, navigate] = useLocation();

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof loginSchema>) {
    try {
      await loginMutation.mutateAsync(values);
      navigate("/");
    } catch (error) {
      // Error will be handled by the mutation's onError
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Login to your account</CardTitle>
        <CardDescription>
          Enter your credentials to access the platform
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter your username" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Enter your password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              className="w-full"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Log in
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

// Forgot Password Form Component
function ForgotPasswordForm({ onSuccess }: { onSuccess: () => void }) {
  const { forgotPasswordMutation } = useAuth();

  const form = useForm<z.infer<typeof forgotPasswordSchema>>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      username: "",
      email: "",
    },
  });

  async function onSubmit(values: z.infer<typeof forgotPasswordSchema>) {
    try {
      await forgotPasswordMutation.mutateAsync(values);
      form.reset();
      if (onSuccess) onSuccess();
    } catch (error) {
      // Error will be handled by the mutation's onError
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reset your password</CardTitle>
        <CardDescription>
          Enter your username and email address to reset your password. If the username and email match, we'll send you a password reset link.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter your username" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="Enter your email"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              className="w-full"
              disabled={forgotPasswordMutation.isPending}
            >
              {forgotPasswordMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Send Reset Link
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

// Reset Password Form Component
function ResetPasswordForm({ token, onSuccess }: { token: string, onSuccess: () => void }) {
  const { resetPasswordMutation } = useAuth();

  const form = useForm<z.infer<typeof resetPasswordSchema>>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      token,
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(values: z.infer<typeof resetPasswordSchema>) {
    try {
      await resetPasswordMutation.mutateAsync(values);
      if (onSuccess) onSuccess();
    } catch (error) {
      // Error will be handled by the mutation's onError
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create new password</CardTitle>
        <CardDescription>
          Enter your new password to complete the password reset process
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Enter new password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Confirm new password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              className="w-full"
              disabled={resetPasswordMutation.isPending}
            >
              {resetPasswordMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Reset Password
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}