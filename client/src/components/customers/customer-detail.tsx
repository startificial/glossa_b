import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Customer, Project } from "@/lib/types";
import { Link } from "wouter";
import {
  Building,
  Mail,
  Globe,
  Phone,
  Edit,
  Clock,
  Calendar,
  Users,
  BarChart,
  AlertTriangle,
  FileText,
} from "lucide-react";
import { format } from "date-fns";
import { CustomerDialog } from "./customer-dialog";

interface CustomerDetailProps {
  customer: Customer;
  projects?: Project[];
}

export function CustomerDetail({ customer }: CustomerDetailProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  
  // Format dates
  const formattedCreatedAt = format(new Date(customer.createdAt), "PPP");
  const formattedUpdatedAt = format(new Date(customer.updatedAt), "PPP");
  
  // Project count and other metrics
  const projectCount = customer.projects?.length || 0;
  
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main info card */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Building className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-2xl">{customer.name}</CardTitle>
                  <div className="text-muted-foreground">
                    {customer.industry || "Industry not specified"}
                  </div>
                </div>
              </div>
              
              <Button 
                size="sm" 
                onClick={() => setEditDialogOpen(true)}
                className="ml-auto"
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
            </div>
          </CardHeader>
          
          <CardContent>
            {/* Key metrics */}
            <div className="grid grid-cols-3 gap-4 mb-6 mt-2">
              <div className="bg-muted p-3 rounded-lg">
                <div className="flex items-center text-muted-foreground mb-1">
                  <Calendar className="h-4 w-4 mr-2" />
                  <span className="text-sm font-medium">Projects</span>
                </div>
                <div className="text-2xl font-bold">{customer.projects?.length || 0}</div>
              </div>
              
              <div className="bg-muted p-3 rounded-lg">
                <div className="flex items-center text-muted-foreground mb-1">
                  <Users className="h-4 w-4 mr-2" />
                  <span className="text-sm font-medium">Team</span>
                </div>
                <div className="text-2xl font-bold">{customer.collaborators || 0}</div>
              </div>
              
              <div className="bg-muted p-3 rounded-lg">
                <div className="flex items-center text-muted-foreground mb-1">
                  <BarChart className="h-4 w-4 mr-2" />
                  <span className="text-sm font-medium">Success Rate</span>
                </div>
                <div className="text-2xl font-bold">
                  {customer.successRate ? `${customer.successRate}%` : "N/A"}
                </div>
              </div>
            </div>
            
            {/* Description */}
            {customer.description && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">Description</h3>
                <p className="text-muted-foreground">{customer.description}</p>
              </div>
            )}
            
            {/* Background information */}
            {customer.backgroundInfo && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">Background</h3>
                <p className="text-muted-foreground whitespace-pre-line">{customer.backgroundInfo}</p>
              </div>
            )}
            
            <Separator className="my-6" />
            
            {/* Contact information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-lg font-semibold mb-3">Contact Information</h3>
                <div className="space-y-2">
                  {customer.website && (
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <a 
                        href={customer.website.startsWith('http') ? customer.website : `https://${customer.website}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {customer.website}
                      </a>
                    </div>
                  )}
                  
                  {customer.contactEmail && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <a 
                        href={`mailto:${customer.contactEmail}`} 
                        className="text-primary hover:underline"
                      >
                        {customer.contactEmail}
                      </a>
                    </div>
                  )}
                  
                  {customer.contactPhone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <a 
                        href={`tel:${customer.contactPhone}`} 
                        className="text-primary hover:underline"
                      >
                        {customer.contactPhone}
                      </a>
                    </div>
                  )}
                  
                  {!customer.website && !customer.contactEmail && !customer.contactPhone && (
                    <div className="flex items-center gap-2 text-muted-foreground italic">
                      <AlertTriangle className="h-4 w-4" />
                      No contact information available
                    </div>
                  )}
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-3">Additional Information</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>Created: {formattedCreatedAt}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>Last updated: {formattedUpdatedAt}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Related projects card */}
        <Card className="">
          <CardHeader>
            <CardTitle className="text-lg">Projects</CardTitle>
          </CardHeader>
          <CardContent>
            {projectCount === 0 ? (
              <div className="text-center py-6">
                <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                <h4 className="text-lg font-medium mb-1">No projects yet</h4>
                <p className="text-muted-foreground text-sm mb-4">
                  This customer doesn't have any projects.
                </p>
                <Link href="/projects/new">
                  <Button size="sm">Create a project</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {customer.projects?.map((project) => (
                  <Link href={`/projects/${project.id}`} key={project.id}>
                    <div className="flex items-center justify-between p-2 rounded-md hover:bg-muted transition-colors cursor-pointer">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        <div>
                          <div className="font-medium">{project.name}</div>
                          <div className="text-xs text-muted-foreground">{project.type}</div>
                        </div>
                      </div>
                      <Badge variant="outline">{project.sourceSystem} → {project.targetSystem}</Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Edit customer dialog */}
      <CustomerDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        mode="edit"
        customerId={customer.id}
        defaultValues={{
          name: customer.name,
          description: customer.description || "",
          industry: customer.industry || "",
          backgroundInfo: customer.backgroundInfo || "",
          website: customer.website || "",
          contactEmail: customer.contactEmail || "",
          contactPhone: customer.contactPhone || "",
        }}
      />
    </>
  );
}