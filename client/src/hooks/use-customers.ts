/**
 * Customers Hook
 * 
 * Custom hook for managing customers data and operations
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from './use-toast';
import { Customer } from '@/lib/types';
import * as customerService from '@/services/api/customerService';

// Query keys
export const customerKeys = {
  all: ['/api/customers'] as const,
  details: (id: number) => [`/api/customers/${id}`] as const,
};

/**
 * Hook for listing customers
 */
export function useCustomers() {
  const { toast } = useToast();
  
  const query = useQuery<Customer[]>({
    queryKey: customerKeys.all,
    queryFn: async () => {
      console.log('[CLIENT] Fetching customers from API...');
      try {
        const result = await customerService.getAllCustomers();
        console.log('[CLIENT] Successfully fetched customers:', result);
        return result;
      } catch (error) {
        console.error('[CLIENT] Error fetching customers:', error);
        // Log the full error details for debugging
        if (error instanceof Error) {
          console.error('[CLIENT] Error details:', {
            message: error.message,
            stack: error.stack,
            name: error.name
          });
        } else {
          console.error('[CLIENT] Non-Error object thrown:', error);
        }
        throw error;
      }
    },
    // React Query v5 doesn't support onError directly in the options
    // Error handling is done in the calling component with useEffect
  });
  
  return {
    ...query,
    customers: query.data,
  };
}

/**
 * Hook for single customer details
 */
export function useCustomer(customerId: number) {
  const { toast } = useToast();
  
  const query = useQuery<Customer>({
    queryKey: customerKeys.details(customerId),
    queryFn: () => customerService.getCustomerById(customerId),
  });
  
  return {
    ...query,
    customer: query.data,
  };
}

/**
 * Hook for customer creation
 */
export function useCreateCustomer() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: (customerData: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>) => 
      customerService.createCustomer(customerData),
    onSuccess: (newCustomer) => {
      // Invalidate customers list
      queryClient.invalidateQueries({ queryKey: customerKeys.all });
      
      toast({
        title: 'Customer created',
        description: `Customer "${newCustomer.name}" was created successfully.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to create customer',
        description: error.message || 'An error occurred while creating the customer.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook for customer update
 */
export function useUpdateCustomer(customerId: number) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: (customerData: Partial<Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>>) => 
      customerService.updateCustomer(customerId, customerData),
    onSuccess: (updatedCustomer) => {
      // Invalidate specific customer
      queryClient.invalidateQueries({ queryKey: customerKeys.details(customerId) });
      // Invalidate customers list
      queryClient.invalidateQueries({ queryKey: customerKeys.all });
      
      toast({
        title: 'Customer updated',
        description: `Customer "${updatedCustomer.name}" was updated successfully.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to update customer',
        description: error.message || 'An error occurred while updating the customer.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook for customer deletion
 */
export function useDeleteCustomer() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: (customerId: number) => 
      customerService.deleteCustomer(customerId),
    onSuccess: (_, customerId) => {
      // Invalidate customers list
      queryClient.invalidateQueries({ queryKey: customerKeys.all });
      
      toast({
        title: 'Customer deleted',
        description: 'Customer was deleted successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to delete customer',
        description: error.message || 'An error occurred while deleting the customer.',
        variant: 'destructive',
      });
    },
  });
}