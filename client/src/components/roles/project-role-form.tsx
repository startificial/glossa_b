import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  Sheet, 
  SheetContent, 
  SheetDescription, 
  SheetHeader, 
  SheetTitle,
  SheetFooter
} from "@/components/ui/sheet";
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ProjectRole, CreateProjectRoleFormData } from "@/lib/types";
import { apiRequest } from "@/lib/queryClient";

interface ProjectRoleFormProps {
  projectId: number;
  role: ProjectRole | null;
  isOpen: boolean;
  onClose: () => void;
}

// Form schema validation
const roleFormSchema = z.object({
  name: z.string().min(1, "Role name is required"),
  roleType: z.string().min(1, "Role type is required"),
  locationType: z.string().min(1, "Location type is required"),
  seniorityLevel: z.string().min(1, "Seniority level is required"),
  description: z.string().optional(),
  costRate: z.string()
    .min(1, "Cost rate is required")
    .refine(val => !isNaN(parseFloat(val)), "Must be a valid number"),
  costUnit: z.string().min(1, "Cost unit is required"),
  currency: z.string().min(1, "Currency is required"),
  isActive: z.boolean().default(true)
});

export function ProjectRoleForm({ projectId, role, isOpen, onClose }: ProjectRoleFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Initialize form with default values or role data if editing
  const form = useForm<CreateProjectRoleFormData>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: {
      name: role?.name || "",
      roleType: role?.roleType || "",
      locationType: role?.locationType || "",
      seniorityLevel: role?.seniorityLevel || "",
      description: role?.description || "",
      costRate: role?.costRate || "",
      costUnit: role?.costUnit || "",
      currency: role?.currency || "USD",
      isActive: role?.isActive ?? true
    }
  });

  // Update form values when role changes (for editing)
  useEffect(() => {
    if (role) {
      form.reset({
        name: role.name,
        roleType: role.roleType,
        locationType: role.locationType,
        seniorityLevel: role.seniorityLevel,
        description: role.description || "",
        costRate: role.costRate,
        costUnit: role.costUnit,
        currency: role.currency,
        isActive: role.isActive
      });
    } else {
      form.reset({
        name: "",
        roleType: "",
        locationType: "",
        seniorityLevel: "",
        description: "",
        costRate: "",
        costUnit: "Hour",
        currency: "USD",
        isActive: true
      });
    }
  }, [role, form]);

  // Create mutation for adding/updating a role
  const roleMutation = useMutation({
    mutationFn: async (data: CreateProjectRoleFormData) => {
      const endpoint = role 
        ? `/api/projects/${projectId}/roles/${role.id}` 
        : `/api/projects/${projectId}/roles`;
      
      const method = role ? "PATCH" : "POST";
      
      return await apiRequest(endpoint, {
        method,
        data
      });
    },
    onSuccess: () => {
      toast({
        title: role ? "Role updated" : "Role created",
        description: role 
          ? "The role has been updated successfully" 
          : "A new role has been created successfully"
      });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/roles`] });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: role 
          ? "Failed to update the role. Please try again." 
          : "Failed to create the role. Please try again.",
        variant: "destructive"
      });
      console.error("Error saving role:", error);
    }
  });

  const onSubmit = (data: CreateProjectRoleFormData) => {
    roleMutation.mutate(data);
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{role ? "Edit Role" : "Add New Role"}</SheetTitle>
          <SheetDescription>
            {role 
              ? "Update the details of this project role" 
              : "Define a new role for this project"}
          </SheetDescription>
        </SheetHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Senior Software Developer" {...field} />
                  </FormControl>
                  <FormDescription>
                    A descriptive name for this project role
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="roleType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role Type</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select role type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Developer">Developer</SelectItem>
                        <SelectItem value="QA">QA</SelectItem>
                        <SelectItem value="BA">Business Analyst</SelectItem>
                        <SelectItem value="PM">Project Manager</SelectItem>
                        <SelectItem value="Architect">Architect</SelectItem>
                        <SelectItem value="DevOps">DevOps</SelectItem>
                        <SelectItem value="Designer">Designer</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="locationType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select location type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Onshore">Onshore</SelectItem>
                        <SelectItem value="Offshore">Offshore</SelectItem>
                        <SelectItem value="Nearshore">Nearshore</SelectItem>
                        <SelectItem value="Remote">Remote</SelectItem>
                        <SelectItem value="Hybrid">Hybrid</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="seniorityLevel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Seniority Level</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select seniority level" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Junior">Junior</SelectItem>
                      <SelectItem value="Mid-Level">Mid-Level</SelectItem>
                      <SelectItem value="Senior">Senior</SelectItem>
                      <SelectItem value="Lead">Lead</SelectItem>
                      <SelectItem value="Principal">Principal</SelectItem>
                      <SelectItem value="Director">Director</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Enter role description and responsibilities"
                      className="resize-none min-h-[100px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    Detailed description of this role's responsibilities and required skills
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="costRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cost Rate</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="GBP">GBP</SelectItem>
                        <SelectItem value="CAD">CAD</SelectItem>
                        <SelectItem value="AUD">AUD</SelectItem>
                        <SelectItem value="INR">INR</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="costUnit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cost Unit</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select cost unit" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Hour">Hour</SelectItem>
                      <SelectItem value="Day">Day</SelectItem>
                      <SelectItem value="Week">Week</SelectItem>
                      <SelectItem value="Month">Month</SelectItem>
                      <SelectItem value="Story Point">Story Point</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    The unit for the cost rate (e.g., per hour, per day)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Active Status</FormLabel>
                    <FormDescription>
                      Inactive roles are excluded from new effort estimates
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            
            <SheetFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={roleMutation.isPending}
              >
                {roleMutation.isPending 
                  ? "Saving..." 
                  : role ? "Update Role" : "Add Role"}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}