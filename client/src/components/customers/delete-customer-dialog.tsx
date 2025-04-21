import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Customer } from "@/lib/types";
import { Loader2, AlertTriangle } from "lucide-react";

interface DeleteCustomerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer;
}

export function DeleteCustomerDialog({ isOpen, onClose, customer }: DeleteCustomerDialogProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [hasAssociatedProjects, setHasAssociatedProjects] = useState(false);
  const [projectCount, setProjectCount] = useState(customer?.projects?.length || 0);

  // Delete customer mutation
  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      return await apiRequest(`/api/customers/${customer.id}`, {
        method: "DELETE",
      });
    },
    onSuccess: (response) => {
      // Invalidate customer queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      
      // Show success message with information about preserved projects
      const preservedProjects = response.preservedProjects || 0;
      
      let message = `Customer "${customer.name}" deleted successfully.`;
      if (preservedProjects > 0) {
        message += ` ${preservedProjects} projects have been preserved.`;
      }
      
      toast({
        title: "Customer deleted",
        description: message,
      });
      
      // Navigate back to customers list
      setLocation("/customers");
    },
    onError: (error) => {
      console.error("Error deleting customer:", error);
      toast({
        title: "Error",
        description: "Failed to delete customer. Please try again.",
        variant: "destructive",
      });
      onClose();
    },
  });

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Customer</AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              Are you sure you want to delete <strong>{customer.name}</strong>?
            </p>
            
            {projectCount > 0 && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-md text-amber-800 dark:text-amber-300">
                <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">This customer has {projectCount} associated projects</p>
                  <p className="text-sm text-amber-700 dark:text-amber-400">
                    The projects will be preserved but will no longer be associated with this customer.
                  </p>
                </div>
              </div>
            )}
            
            <p>This action cannot be undone.</p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={(e) => {
              e.preventDefault();
              mutate();
            }}
            disabled={isPending}
            className="bg-destructive hover:bg-destructive/90"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              'Delete Customer'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}