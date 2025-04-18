import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ProjectRole } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { PlusCircle, Edit, Trash2, Coins } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ProjectRoleForm } from "./project-role-form";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency } from "@/lib/utils";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface ProjectRolesListProps {
  projectId: number;
}

export function ProjectRolesList({ projectId }: ProjectRolesListProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddingRole, setIsAddingRole] = useState(false);
  const [editingRole, setEditingRole] = useState<ProjectRole | null>(null);
  const [deletingRole, setDeletingRole] = useState<ProjectRole | null>(null);

  const { data: roles, isLoading, error } = useQuery<ProjectRole[]>({
    queryKey: [`/api/projects/${projectId}/roles`],
  });

  const deleteRoleMutation = useMutation({
    mutationFn: async (roleId: number) => {
      return await apiRequest(`/api/projects/${projectId}/roles/${roleId}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      toast({
        title: "Role deleted",
        description: "The role has been deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/roles`] });
      setDeletingRole(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete the role. Please try again.",
        variant: "destructive",
      });
      console.error("Error deleting role:", error);
    },
  });

  const handleAddRole = () => {
    setIsAddingRole(true);
    setEditingRole(null);
  };

  const handleEditRole = (role: ProjectRole) => {
    setEditingRole(role);
    setIsAddingRole(false);
  };

  const handleDeleteRole = (role: ProjectRole) => {
    setDeletingRole(role);
  };

  const confirmDeleteRole = () => {
    if (deletingRole) {
      deleteRoleMutation.mutate(deletingRole.id);
    }
  };

  const handleFormClose = () => {
    setIsAddingRole(false);
    setEditingRole(null);
  };

  const getRoleTypeColor = (roleType: string) => {
    const typeMap: Record<string, string> = {
      "Developer": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
      "QA": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
      "BA": "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
      "PM": "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
      "Architect": "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
    };
    
    return typeMap[roleType] || "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
  };

  const getLocationColor = (locationType: string) => {
    const locationMap: Record<string, string> = {
      "Onshore": "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300",
      "Offshore": "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
      "Nearshore": "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300"
    };
    
    return locationMap[locationType] || "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <span>Project Roles</span>
            <Button size="sm" onClick={handleAddRole} disabled>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Role
            </Button>
          </CardTitle>
          <CardDescription>Loading project roles...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <span>Project Roles</span>
            <Button size="sm" onClick={handleAddRole}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Role
            </Button>
          </CardTitle>
          <CardDescription className="text-red-500">
            Error loading project roles. Please try again.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <span>Project Roles</span>
            <Button size="sm" onClick={handleAddRole}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Role
            </Button>
          </CardTitle>
          <CardDescription>
            Define and manage project team roles with associated costs for effort estimation
          </CardDescription>
        </CardHeader>
        <CardContent>
          {roles && roles.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Role Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Seniority</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell className="font-medium">{role.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getRoleTypeColor(role.roleType)}>
                        {role.roleType}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getLocationColor(role.locationType)}>
                        {role.locationType}
                      </Badge>
                    </TableCell>
                    <TableCell>{role.seniorityLevel}</TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Coins className="mr-1 h-4 w-4 text-muted-foreground" />
                        <span>
                          {formatCurrency(parseFloat(role.costRate), role.currency)} / {role.costUnit}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditRole(role)}
                          title="Edit role"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteRole(role)}
                          title="Delete role"
                          className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-primary/10 p-3 mb-4">
                <Coins className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-medium">No roles defined</h3>
              <p className="text-sm text-muted-foreground mt-1 mb-4 max-w-md">
                Define roles that will be involved in this project to accurately estimate effort and cost.
              </p>
              <Button onClick={handleAddRole}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add First Role
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {(isAddingRole || editingRole) && (
        <ProjectRoleForm
          projectId={projectId}
          role={editingRole}
          isOpen={true}
          onClose={handleFormClose}
        />
      )}

      <AlertDialog open={!!deletingRole} onOpenChange={(open) => !open && setDeletingRole(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Role</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the role "{deletingRole?.name}"? This action cannot be undone.
              {deletingRole && (
                <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-md text-amber-800 dark:text-amber-300 text-sm">
                  <strong>Warning:</strong> Deleting this role will also remove all effort estimations associated with it.
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteRole}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}