import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { CreateProjectFormData, Customer } from "@/lib/types";
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
import { FolderPlus, PlusCircle } from "lucide-react";
import { CustomerDialog } from "@/components/customers/customer-dialog";

const projectSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  description: z.string().optional(),
  type: z.string().min(1, "Project type is required"),
  customerId: z.string().optional(), // We'll convert to number when submitting
  sourceSystem: z.string().optional(),
  targetSystem: z.string().optional(),
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

  // Fetch customers for the dropdown
  const { data: customers = [], isLoading: isLoadingCustomers } = useQuery<Customer[]>({
    queryKey: ['/api/customers'],
    enabled: isOpen, // Only fetch when dialog is open
  });
  
  const form = useForm<CreateProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: "",
      description: "",
      type: "Software Migration",
      customerId: "none",
      sourceSystem: "",
      targetSystem: "",
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
    mutationFn: async (data: CreateProjectFormData) => {
      return apiRequest("POST", "/api/projects", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      onClose();
      form.reset();
      toast({
        title: "Success",
        description: "Project created successfully",
      });
    },
    onError: (error) => {
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
    // If a customer wasn't created (via handleCustomerCreated), make sure the form value isn't set to "add_new"
    const currentValue = form.getValues('customerId');
    if (currentValue === 'add_new') {
      form.setValue('customerId', 'none');
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-[525px]">
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
                        if (value === 'add_new') {
                          // Don't update the form value yet, just open the dialog
                          setCustomerDialogOpen(true);
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
