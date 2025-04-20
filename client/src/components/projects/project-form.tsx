import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { CreateProjectFormData, Customer, ProjectRoleTemplate } from "@/lib/types";
import { useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { FolderPlus, PlusCircle } from "lucide-react";
import { CustomerDialog } from "@/components/customers/customer-dialog";
import { useProjectRoleTemplates } from "@/hooks/use-application-settings";

const projectSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  description: z.string().optional(),
  type: z.string().min(1, "Project type is required"),
  customerId: z.string().optional(), // We'll convert to number when submitting
  sourceSystem: z.string().optional(),
  targetSystem: z.string().optional(),
  roleTemplateIds: z.array(z.string()).optional(),
});

interface ProjectFormProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProjectForm({ isOpen, onClose }: ProjectFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [location] = useLocation();

  // Debug props
  console.log("ProjectForm render - isOpen:", isOpen);

  // Fetch customers for the dropdown
  const { data: customers = [], isLoading: isLoadingCustomers } = useQuery<Customer[]>({
    queryKey: ['/api/customers'],
    enabled: isOpen, // Only fetch when dialog is open
  });
  
  // Fetch role templates for the form
  const { templates: roleTemplates, isLoading: isLoadingTemplates } = useProjectRoleTemplates();
  
  // State to track selected role templates
  const [selectedRoleTemplates, setSelectedRoleTemplates] = useState<string[]>([]);
  
  const form = useForm<CreateProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: "",
      description: "",
      type: "Software Migration",
      customerId: "none",
      sourceSystem: "",
      targetSystem: "",
      roleTemplateIds: [],
    },
  });
  
  // Handle when a new customer is created from the dialog
  const handleCustomerCreated = (newCustomer: Customer) => {
    // Set the new customer as the selected customer
    form.setValue('customerId', newCustomer.id.toString());
  };

  // Get customerId from URL query parameter
  useEffect(() => {
    if (isOpen && location) {
      // Parse URL query parameters
      const urlParams = new URLSearchParams(window.location.search);
      const customerId = urlParams.get('customerId');
      
      // If a customerId is provided and it's valid, set it in the form
      if (customerId && customers.some(c => c.id.toString() === customerId)) {
        form.setValue('customerId', customerId);
      }
    }
  }, [isOpen, location, customers, form]);

  const createProject = useMutation({
    mutationFn: async (data: any) => {
      console.log("Making API request with data:", data);
      try {
        const response = await apiRequest<any>("/api/projects", { method: "POST", data });
        console.log("API response:", response);
        return response;
      } catch (error) {
        console.error("API request error:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log("Project creation successful:", data);
      // Invalidate projects query
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      
      // Invalidate specific customer query if a customer was selected
      if (form.getValues().customerId) {
        const customerId = form.getValues().customerId;
        queryClient.invalidateQueries({ queryKey: [`/api/customers/${customerId}`] });
      }
      
      onClose();
      form.reset();
      toast({
        title: "Success",
        description: "Project created successfully",
      });
    },
    onError: (error) => {
      console.error("Project creation mutation error:", error);
      toast({
        title: "Error",
        description: `Failed to create project: ${error.message}`,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  function onSubmit(data: CreateProjectFormData) {
    setIsSubmitting(true);
    // Convert empty strings to null for API
    const apiData = {
      name: data.name,
      type: data.type,
      description: data.description.trim() === '' ? null : data.description,
      customerId: data.customerId && data.customerId !== 'none' ? parseInt(data.customerId) : null,
      sourceSystem: data.sourceSystem?.trim() === '' ? null : data.sourceSystem,
      targetSystem: data.targetSystem?.trim() === '' ? null : data.targetSystem,
      roleTemplateIds: data.roleTemplateIds || [],
    };
    console.log('Submitting project with data:', apiData);
    // Use a type assertion to handle the server-side typing correctly
    createProject.mutate(apiData as any);
  }

  // Handler for when "Add New Customer" is clicked
  const handleAddNewCustomer = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCustomerDialogOpen(true);
  };

  // Handler for closing the customer dialog
  const handleCloseCustomerDialog = () => {
    setCustomerDialogOpen(false);
    // No need to check and reset the form value since we never set it to 'add_new'
  };

  // Log when the Dialog renders and its open state
  console.log("Dialog about to render with isOpen:", isOpen);

  return (
    <>
      <Dialog 
        open={isOpen} 
        onOpenChange={(open) => {
          console.log("Dialog onOpenChange triggered with value:", open);
          if (!open) onClose();
        }}
      >
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900">
                <FolderPlus className="h-5 w-5 text-blue-600 dark:text-blue-300" />
              </div>
              <div>
                <DialogTitle>Create New Project</DialogTitle>
                <DialogDescription>
                  Create a new project to start organizing your requirements.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter project name" {...field} />
                    </FormControl>
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
                        placeholder="Describe your project"
                        className="resize-none"
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select project type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Software Migration">Software Migration</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="customerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        // Only update the field value if it's not 'add_new'
                        if (value === 'add_new') {
                          setCustomerDialogOpen(true);
                          // Don't change the form value
                        } else {
                          field.onChange(value);
                        }
                      }}
                      value={field.value?.toString() || 'none'}
                      disabled={isLoadingCustomers}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a customer" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {customers.map((customer: Customer) => (
                          <SelectItem key={customer.id} value={customer.id.toString()}>
                            {customer.name}
                          </SelectItem>
                        ))}
                        <SelectItem 
                          value="add_new" 
                          className="text-primary font-medium border-t mt-1 pt-1"
                        >
                          <span className="flex items-center gap-1.5">
                            <PlusCircle className="h-4 w-4" />
                            Add New Customer
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="sourceSystem"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Source System</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g., Legacy CRM" 
                          {...field}
                          value={field.value || ''} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="targetSystem"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target System</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g., Cloud CRM" 
                          {...field}
                          value={field.value || ''} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="roleTemplateIds"
                render={() => (
                  <FormItem>
                    <div className="mb-4">
                      <FormLabel className="text-base">Project Roles</FormLabel>
                      <FormDescription>
                        Select role templates to include in this project
                      </FormDescription>
                    </div>
                    
                    {/* Role template selection UI */}
                    <div className="space-y-4">
                      {/* Search filter input */}
                      <Input 
                        type="text"
                        placeholder="Search roles..."
                        onChange={(e) => {
                          // We'd implement filtering logic here in a real app
                          // For now we'll just show all templates
                        }}
                        className="mb-2"
                      />
                      
                      {/* Selected roles display */}
                      {selectedRoleTemplates.length > 0 && (
                        <div className="p-2 border rounded-md bg-muted/40">
                          <h4 className="text-sm font-medium mb-2">Selected Roles:</h4>
                          <div className="flex flex-wrap gap-2">
                            {selectedRoleTemplates.map(id => {
                              const template = roleTemplates.find(t => t.id === id);
                              return template ? (
                                <div key={id} className="flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs">
                                  <span>{template.name}</span>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-4 w-4 ml-1 p-0"
                                    onClick={() => {
                                      const updatedSelection = selectedRoleTemplates.filter(
                                        templateId => templateId !== id
                                      );
                                      setSelectedRoleTemplates(updatedSelection);
                                      form.setValue('roleTemplateIds', updatedSelection);
                                    }}
                                  >
                                    <span className="sr-only">Remove</span>
                                    <svg 
                                      xmlns="http://www.w3.org/2000/svg" 
                                      width="12" 
                                      height="12" 
                                      viewBox="0 0 24 24" 
                                      fill="none" 
                                      stroke="currentColor" 
                                      strokeWidth="2" 
                                      strokeLinecap="round" 
                                      strokeLinejoin="round"
                                    >
                                      <path d="M18 6 6 18"/>
                                      <path d="m6 6 12 12"/>
                                    </svg>
                                  </Button>
                                </div>
                              ) : null;
                            })}
                          </div>
                        </div>
                      )}
                      
                      {/* Available templates list */}
                      <div className="grid gap-2 max-h-64 overflow-y-auto">
                        {roleTemplates.map((template) => {
                          const isSelected = selectedRoleTemplates.includes(template.id as string);
                          return (
                            <div
                              key={template.id}
                              className={`
                                flex items-center justify-between p-3 rounded-md cursor-pointer
                                ${isSelected ? 'bg-primary/10 border-primary' : 'border'}
                                hover:bg-accent transition-colors
                              `}
                              onClick={() => {
                                let updatedSelection: string[];
                                if (isSelected) {
                                  // Remove if already selected
                                  updatedSelection = selectedRoleTemplates.filter(id => id !== template.id);
                                } else {
                                  // Add if not selected
                                  updatedSelection = [...selectedRoleTemplates, template.id as string];
                                }
                                setSelectedRoleTemplates(updatedSelection);
                                form.setValue('roleTemplateIds', updatedSelection);
                              }}
                            >
                              <div>
                                <div className="font-medium">{template.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {template.roleType} ({template.locationType}, {template.seniorityLevel}) - {template.costRate} {template.currency}/{template.costUnit}
                                </div>
                              </div>
                              {isSelected && (
                                <div className="h-4 w-4 rounded-full bg-primary flex items-center justify-center">
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="10"
                                    height="10"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="white"
                                    strokeWidth="3"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <polyline points="20 6 9 17 4 12" />
                                  </svg>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Creating..." : "Create Project"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      <CustomerDialog 
        isOpen={customerDialogOpen}
        onClose={handleCloseCustomerDialog}
        onCustomerCreated={handleCustomerCreated}
      />
    </>
  );
}
