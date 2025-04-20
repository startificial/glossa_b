import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Project } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ProjectEditDialogProps {
  project: Project;
  isOpen: boolean;
  onClose: () => void;
}

const projectEditSchema = z.object({
  name: z.string().min(3, "Project name must be at least 3 characters"),
  description: z.string().nullable().optional(),
  type: z.string(),
  stage: z.string(),
  customer: z.string().nullable().optional(),
  sourceSystem: z.string().nullable().optional(),
  targetSystem: z.string().nullable().optional(),
});

type ProjectEditFormValues = z.infer<typeof projectEditSchema>;

export function ProjectEditDialog({ project, isOpen, onClose }: ProjectEditDialogProps) {
  const { toast } = useToast();
  
  // Handle customer which can be a string or an object
  const getCustomerValue = (customer: any): string => {
    if (typeof customer === 'object' && customer && customer.name) {
      return customer.name;
    }
    return typeof customer === 'string' ? customer : '';
  };

  const form = useForm<ProjectEditFormValues>({
    resolver: zodResolver(projectEditSchema),
    defaultValues: {
      name: project.name,
      description: project.description || '',
      type: project.type,
      stage: project.stage || 'discovery',
      customer: getCustomerValue(project.customer),
      sourceSystem: project.sourceSystem || '',
      targetSystem: project.targetSystem || '',
    },
  });

  useEffect(() => {
    if (isOpen) {
      form.reset({
        name: project.name,
        description: project.description || '',
        type: project.type,
        stage: project.stage || 'discovery',
        customer: getCustomerValue(project.customer),
        sourceSystem: project.sourceSystem || '',
        targetSystem: project.targetSystem || '',
      });
    }
  }, [isOpen, project, form]);

  const updateMutation = useMutation({
    mutationFn: async (data: ProjectEditFormValues) => {
      return apiRequest(
        `/api/projects/${project.id}`,
        { 
          method: "PUT",
          data
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${project.id}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      
      toast({
        title: "Project updated",
        description: "The project has been updated successfully.",
      });
      
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error updating project",
        description: "There was a problem updating the project.",
        variant: "destructive",
      });
    }
  });

  const onSubmit = (data: ProjectEditFormValues) => {
    // Clean up empty strings to be null for API
    const apiData = {
      name: data.name,
      type: data.type,
      stage: data.stage,
      description: data.description?.trim() === '' ? null : data.description,
      customer: data.customer?.trim() === '' ? null : data.customer,
      sourceSystem: data.sourceSystem?.trim() === '' ? null : data.sourceSystem,
      targetSystem: data.targetSystem?.trim() === '' ? null : data.targetSystem,
    };
    
    updateMutation.mutate(apiData as any);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Project</DialogTitle>
          <DialogDescription>
            Update project information and settings. Be sure to configure source and target systems for migration projects.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
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
                      {...field} 
                      value={field.value || ''} 
                      placeholder="Enter project description..." 
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
              name="stage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Stage</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select project stage" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="discovery">Discovery</SelectItem>
                      <SelectItem value="planning">Planning</SelectItem>
                      <SelectItem value="implementation">Implementation</SelectItem>
                      <SelectItem value="testing">Testing</SelectItem>
                      <SelectItem value="deployment">Deployment</SelectItem>
                      <SelectItem value="closed/won">Closed / Won</SelectItem>
                      <SelectItem value="closed/lost">Closed / Lost</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="customer"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Customer</FormLabel>
                  <FormControl>
                    <Input 
                      {...field}
                      value={field.value || ''}
                      placeholder="e.g., Acme Inc."
                    />
                  </FormControl>
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
                        {...field} 
                        value={field.value || ''} 
                        placeholder="e.g., Legacy CRM" 
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
                        {...field} 
                        value={field.value || ''} 
                        placeholder="e.g., Cloud CRM" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-current rounded-full border-t-transparent mr-2"></div>
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}