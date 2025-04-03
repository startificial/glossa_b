import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Customer, CreateCustomerFormData } from "@/lib/types";
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
import { Building2, User2 } from "lucide-react";

const customerSchema = z.object({
  name: z.string().min(1, "Customer name is required"),
  description: z.string().optional(),
  industry: z.string().optional(),
  backgroundInfo: z.string().optional(),
  website: z.string().optional(),
  contactEmail: z.string().email("Invalid email address").optional().or(z.literal('')),
  contactPhone: z.string().optional(),
});

interface CustomerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  customer?: Customer; // If provided, dialog will be in edit mode
}

export function CustomerDialog({ isOpen, onClose, customer }: CustomerDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditMode = !!customer;

  const form = useForm<CreateCustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: customer?.name || "",
      description: customer?.description || "",
      industry: customer?.industry || "",
      backgroundInfo: customer?.backgroundInfo || "",
      website: customer?.website || "",
      contactEmail: customer?.contactEmail || "",
      contactPhone: customer?.contactPhone || "",
    },
  });

  const createCustomer = useMutation({
    mutationFn: async (data: CreateCustomerFormData) => {
      const endpoint = isEditMode 
        ? `/api/customers/${customer.id}` 
        : "/api/customers";
      const method = isEditMode ? "PUT" : "POST";
      return apiRequest(method, endpoint, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      onClose();
      form.reset();
      toast({
        title: "Success",
        description: `Customer ${isEditMode ? 'updated' : 'created'} successfully`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to ${isEditMode ? 'update' : 'create'} customer: ${error.message}`,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  function onSubmit(data: CreateCustomerFormData) {
    setIsSubmitting(true);
    // Convert empty strings to null for API
    const apiData = {
      name: data.name,
      description: data.description.trim() === '' ? null : data.description,
      industry: data.industry?.trim() === '' ? null : data.industry,
      backgroundInfo: data.backgroundInfo?.trim() === '' ? null : data.backgroundInfo,
      website: data.website?.trim() === '' ? null : data.website,
      contactEmail: data.contactEmail?.trim() === '' ? null : data.contactEmail,
      contactPhone: data.contactPhone?.trim() === '' ? null : data.contactPhone,
    };
    
    createCustomer.mutate(apiData as any);
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-indigo-100 dark:bg-indigo-900">
              {isEditMode ? (
                <User2 className="h-5 w-5 text-indigo-600 dark:text-indigo-300" />
              ) : (
                <Building2 className="h-5 w-5 text-indigo-600 dark:text-indigo-300" />
              )}
            </div>
            <div>
              <DialogTitle>{isEditMode ? 'Edit Customer' : 'Create New Customer'}</DialogTitle>
              <DialogDescription>
                {isEditMode 
                  ? 'Update customer information' 
                  : 'Add a new customer to manage their projects'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Customer Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter customer name" {...field} />
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
                      placeholder="Brief description of the customer"
                      className="resize-none"
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="industry"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Industry</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., Healthcare, Finance" 
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
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., www.example.com" 
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
              name="backgroundInfo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Background Information</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="More detailed information about the customer"
                      className="resize-none"
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="contactEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Email</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="contact@example.com" 
                        type="email"
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
                name="contactPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Phone</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., (123) 456-7890" 
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
                {isSubmitting ? (isEditMode ? "Updating..." : "Creating...") : (isEditMode ? "Update Customer" : "Create Customer")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}