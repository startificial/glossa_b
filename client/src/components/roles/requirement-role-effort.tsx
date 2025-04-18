import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Plus, Trash2, Users } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { apiRequest } from "@/lib/queryClient";
import { ProjectRole, RequirementRoleEffort } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";

interface RequirementRoleEffortProps {
  projectId: number;
  requirementId: number;
}

export function RequirementRoleEffort({ projectId, requirementId }: RequirementRoleEffortProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [effortAmount, setEffortAmount] = useState<string>("");
  const [effortUnit, setEffortUnit] = useState<string>("Hour");

  // Query roles for this project
  const { data: roles, isLoading: rolesLoading } = useQuery<ProjectRole[]>({
    queryKey: [`/api/projects/${projectId}/roles`],
  });

  // Query existing role efforts for this requirement
  const { data: roleEfforts, isLoading: effortsLoading } = useQuery<RequirementRoleEffort[]>({
    queryKey: [`/api/requirements/${requirementId}/role-efforts`],
  });

  // Mutation to add role effort
  const addRoleEffortMutation = useMutation({
    mutationFn: async (data: { roleId: number; estimatedEffort: string; effortUnit: string }) => {
      return await apiRequest(`/api/requirements/${requirementId}/role-efforts`, {
        method: "POST",
        data,
      });
    },
    onSuccess: () => {
      toast({
        title: "Role effort added",
        description: "Role effort has been added to the requirement",
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/requirements/${requirementId}/role-efforts`],
      });
      // Reset form
      setIsAdding(false);
      setSelectedRoleId(null);
      setEffortAmount("");
      setEffortUnit("Hour");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to add role effort. Please try again.",
        variant: "destructive",
      });
      console.error("Error adding role effort:", error);
    },
  });

  // Mutation to delete role effort
  const deleteRoleEffortMutation = useMutation({
    mutationFn: async (effortId: number) => {
      return await apiRequest(`/api/requirements/${requirementId}/role-efforts/${effortId}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      toast({
        title: "Role effort removed",
        description: "Role effort has been removed from the requirement",
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/requirements/${requirementId}/role-efforts`],
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to remove role effort. Please try again.",
        variant: "destructive",
      });
      console.error("Error removing role effort:", error);
    },
  });

  const handleAddRoleEffort = () => {
    if (!selectedRoleId || !effortAmount) {
      toast({
        title: "Missing information",
        description: "Please select a role and enter an effort amount",
        variant: "destructive",
      });
      return;
    }

    addRoleEffortMutation.mutate({
      roleId: selectedRoleId,
      estimatedEffort: effortAmount,
      effortUnit: effortUnit,
    });
  };

  const handleDeleteRoleEffort = (effortId: number) => {
    deleteRoleEffortMutation.mutate(effortId);
  };

  // Filter out roles that are already assigned to prevent duplicates
  const getAvailableRoles = () => {
    if (!roles || !roleEfforts) return [];
    
    const assignedRoleIds = roleEfforts.map(effort => effort.roleId);
    return roles.filter(role => !assignedRoleIds.includes(role.id));
  };

  // Get the role object for a given role ID
  const getRoleById = (roleId: number) => {
    return roles?.find(role => role.id === roleId);
  };

  // Calculate the total cost for all role efforts
  const calculateTotalCost = () => {
    if (!roleEfforts || !roles) return 0;
    
    return roleEfforts.reduce((total, effort) => {
      const role = getRoleById(effort.roleId);
      if (!role) return total;
      
      // Convert effort to hours if needed
      let multiplier = 1;
      if (effort.effortUnit === "Day") multiplier = 8;
      if (effort.effortUnit === "Week") multiplier = 40;
      if (effort.effortUnit === "Month") multiplier = 160;
      
      // Only convert if role is also in hours
      if (role.costUnit === "Hour") {
        return total + (parseFloat(role.costRate) * parseFloat(effort.estimatedEffort) * multiplier);
      }
      
      // Simple calculation if units match
      if (role.costUnit === effort.effortUnit) {
        return total + (parseFloat(role.costRate) * parseFloat(effort.estimatedEffort));
      }
      
      // Default case, just add without conversion
      return total + (parseFloat(role.costRate) * parseFloat(effort.estimatedEffort));
    }, 0);
  };

  if (rolesLoading || effortsLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users size={18} />
            <span>Role Effort</span>
          </CardTitle>
          <CardDescription>Loading role effort data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const availableRoles = getAvailableRoles();
  const hasAssignedRoles = roleEfforts && roleEfforts.length > 0;
  const totalCost = calculateTotalCost();
  const hasNoRoles = !roles || roles.length === 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Users size={18} />
            <span>Role Effort Estimation</span>
          </div>
          
          {!isAdding && !hasNoRoles && (
            <Button 
              onClick={() => setIsAdding(true)} 
              variant="outline" 
              size="sm"
              disabled={availableRoles.length === 0}
            >
              <Plus className="mr-1 h-4 w-4" />
              Assign Role
            </Button>
          )}
        </CardTitle>
        <CardDescription>
          Estimate the effort required from specific roles to implement this requirement
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {hasNoRoles ? (
          <Alert variant="default">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No roles have been defined for this project yet. 
              <Button 
                variant="link" 
                className="h-auto p-0 pl-1"
                onClick={() => {
                  // Navigate to roles tab
                  window.location.href = `/projects/${projectId}?tab=roles`;
                }}
              >
                Define roles first
              </Button>
            </AlertDescription>
          </Alert>
        ) : (
          <>
            {isAdding && (
              <div className="space-y-4 mb-6 p-4 border rounded-md bg-slate-50 dark:bg-slate-900">
                <h4 className="text-sm font-medium">Assign Role</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select 
                      onValueChange={(value) => setSelectedRoleId(parseInt(value))} 
                      value={selectedRoleId?.toString() || ""}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableRoles.map((role) => (
                          <SelectItem key={role.id} value={role.id.toString()}>
                            {role.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <Label htmlFor="effort">Effort</Label>
                      <Input
                        id="effort"
                        type="number"
                        min="0"
                        step="0.5"
                        value={effortAmount}
                        onChange={(e) => setEffortAmount(e.target.value)}
                        placeholder="Amount"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="unit">Unit</Label>
                      <Select 
                        onValueChange={setEffortUnit} 
                        value={effortUnit}
                      >
                        <SelectTrigger id="unit">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Hour">Hour</SelectItem>
                          <SelectItem value="Day">Day</SelectItem>
                          <SelectItem value="Week">Week</SelectItem>
                          <SelectItem value="Month">Month</SelectItem>
                          <SelectItem value="Story Point">Story Point</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsAdding(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleAddRoleEffort}
                    disabled={!selectedRoleId || !effortAmount || addRoleEffortMutation.isPending}
                  >
                    {addRoleEffortMutation.isPending ? "Adding..." : "Add Effort"}
                  </Button>
                </div>
              </div>
            )}
            
            {hasAssignedRoles ? (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Role</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Estimated Effort</TableHead>
                      <TableHead>Cost Rate</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {roleEfforts?.map((effort) => {
                      const role = getRoleById(effort.roleId);
                      if (!role) return null;
                      
                      return (
                        <TableRow key={effort.id}>
                          <TableCell className="font-medium">{role.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {role.roleType}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {effort.estimatedEffort} {effort.effortUnit}
                            {effort.effortUnit === "Hour" && parseFloat(effort.estimatedEffort) > 8 && (
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Badge 
                                    variant="secondary" 
                                    className="ml-2 cursor-help"
                                  >
                                    {Math.round(parseFloat(effort.estimatedEffort) / 8 * 10) / 10} days
                                  </Badge>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-2 text-xs">
                                  Converted to days (8 hours = 1 day)
                                </PopoverContent>
                              </Popover>
                            )}
                          </TableCell>
                          <TableCell>
                            {formatCurrency(parseFloat(role.costRate), role.currency)} / {role.costUnit}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteRoleEffort(effort.id)}
                              className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                
                <Separator className="my-4" />
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    Total estimated roles: {roleEfforts?.length || 0}
                  </span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">Estimated total cost:</span>
                    <span className="text-lg font-bold text-primary">
                      {formatCurrency(totalCost, roles?.[0]?.currency || "USD")}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <div className="rounded-full bg-primary/10 p-3 mb-4">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-medium">No roles assigned</h3>
                <p className="text-sm text-muted-foreground mt-1 mb-4 max-w-md">
                  Assign roles to estimate effort required for implementing this requirement
                </p>
                
                {!isAdding && (
                  <Button onClick={() => setIsAdding(true)} disabled={availableRoles.length === 0}>
                    <Plus className="mr-2 h-4 w-4" />
                    Assign First Role
                  </Button>
                )}
                
                {availableRoles.length === 0 && roles && roles.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    All available roles have been assigned to this requirement
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}