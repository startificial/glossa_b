import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { User } from "@/lib/types";

// Create a schema for user profile updates
const userProfileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  company: z.string().min(1, "Company name is required"),
  avatarUrl: z.string().nullable().optional(),
});

type UserProfileFormValues = z.infer<typeof userProfileSchema>;

export function UserProfile() {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);

  // Fetch user data
  const { data: user, isLoading, error } = useQuery<User>({
    queryKey: ["/api/me"],
  });

  // Create form with react-hook-form
  const form = useForm<UserProfileFormValues>({
    resolver: zodResolver(userProfileSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      company: "",
      avatarUrl: null,
    },
  });

  // Update form when user data is loaded
  useEffect(() => {
    if (user) {
      form.reset({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || "",
        company: user.company || "",
        avatarUrl: user.avatarUrl || null,
      });
    }
  }, [user, form]);

  // Mutation for updating user profile
  const mutation = useMutation({
    mutationFn: async (values: UserProfileFormValues) => {
      return apiRequest<User>("PUT", "/api/me", values);
    },
    onSuccess: () => {
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
      setIsEditing(false);
      // Invalidate the user query to refresh the data
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: "Failed to update your profile. Please try again.",
        variant: "destructive",
      });
      console.error("Error updating profile:", error);
    },
  });

  const onSubmit = (values: UserProfileFormValues) => {
    mutation.mutate(values);
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>User Profile</CardTitle>
          <CardDescription>Loading your profile information...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>User Profile</CardTitle>
          <CardDescription className="text-red-500">
            Error loading profile. Please try again later.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>User Profile</CardTitle>
          <CardDescription>Manage your personal information</CardDescription>
        </div>
        <Avatar className="h-16 w-16">
          {user?.avatarUrl ? (
            <AvatarImage src={user.avatarUrl} alt={`${user.firstName} ${user.lastName}`} />
          ) : (
            <AvatarFallback className="text-xl">
              {user?.firstName?.charAt(0) || ""}{user?.lastName?.charAt(0) || ""}
            </AvatarFallback>
          )}
        </Avatar>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="john.doe@example.com" {...field} />
                    </FormControl>
                    <FormDescription>This is your contact email address.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="company"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company</FormLabel>
                    <FormControl>
                      <Input placeholder="Acme Inc." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end space-x-2">
                <Button variant="outline" type="button" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={mutation.isPending}>
                  {mutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </Form>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">First Name</h3>
                <p className="text-base">{user?.firstName || "Not set"}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Last Name</h3>
                <p className="text-base">{user?.lastName || "Not set"}</p>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Email</h3>
              <p className="text-base">{user?.email || "Not set"}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Company</h3>
              <p className="text-base">{user?.company || "Not set"}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Username</h3>
              <p className="text-base">{user?.username}</p>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        {!isEditing && (
          <Button onClick={() => setIsEditing(true)}>
            Edit Profile
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}