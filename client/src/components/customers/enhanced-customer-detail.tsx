import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { format } from "date-fns";
import { Customer, Project } from "../../lib/types";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  Star,
  Globe,
  Mail,
  Phone,
  Edit2,
  Clock,
  Calendar,
  Users,
  PieChart,
  CheckCircle2,
  File,
  FileText,
  ExternalLink,
  ChevronRight,
  ArrowLeft
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter
} from "../ui/card";
import { Button } from "../ui/button";
import { Separator } from "../ui/separator";
import { Badge } from "../ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { CustomerDialog } from "./customer-dialog";
import { ProjectForm } from "../projects/project-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Progress } from "../ui/progress";

// Generate fallback avatar based on name for consistency
function generateAvatarFallback(name: string): string {
  return name
    .split(" ")
    .map(word => word[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);
}

// Generate color based on customer name (for banner background)
function generateBannerColor(name: string): string {
  // Simple hash function to generate a consistent hue value
  const hash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const hue = hash % 360;
  
  return `linear-gradient(135deg, hsl(${hue}, 80%, 85%), hsl(${(hue + 60) % 360}, 80%, 75%))`;
}

interface EnhancedCustomerDetailProps {
  customer: Customer;
  projects?: Project[];
}

export function EnhancedCustomerDetail({ customer, projects }: EnhancedCustomerDetailProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [projectFormOpen, setProjectFormOpen] = useState(false);
  const queryClient = useQueryClient();
  
  // Format dates
  const formattedCreatedAt = format(new Date(customer.createdAt), "PPP");
  const formattedUpdatedAt = format(new Date(customer.updatedAt), "PPP");
  
  // Project metrics
  const projectCount = customer.projects?.length || 0;
  
  // Industries as tags
  const industries = customer.industry ? customer.industry.split(",").map(i => i.trim()) : [];
  
  // Avatar and banner
  const avatarFallback = generateAvatarFallback(customer.name);
  const bannerStyle = { background: generateBannerColor(customer.name) };
  
  // Open project form dialog
  const handleOpenProjectForm = () => {
    // Update URL to include customerId parameter
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set('customerId', customer.id.toString());
    window.history.replaceState({}, '', currentUrl.toString());
    
    // Open the project form dialog
    setProjectFormOpen(true);
  };
  
  return (
    <>
      <div className="mb-6">
        <Link href="/customers">
          <Button variant="ghost" className="pl-0 mb-2">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Customers
          </Button>
        </Link>
      </div>
    
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main info card */}
        <Card className="lg:col-span-2 overflow-hidden">
          {/* Colorful banner header */}
          <div 
            className="h-36 w-full relative" 
            style={bannerStyle}
          ></div>
          
          <div className="px-6 -mt-12 relative">
            {/* Avatar with verified badge */}
            <div className="flex justify-between">
              <div className="relative">
                <Avatar className="h-24 w-24 border-4 border-background">
                  <AvatarFallback className="text-2xl bg-primary/10">
                    {avatarFallback}
                  </AvatarFallback>
                  <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(customer.name)}`} />
                </Avatar>
                {projectCount > 0 && (
                  <div className="absolute bottom-0 right-0 bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center border-2 border-background">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                )}
              </div>
              
              <Button 
                onClick={() => setEditDialogOpen(true)} 
                variant="outline"
                className="h-9 mt-4"
              >
                <Edit2 className="mr-2 h-4 w-4" />
                Edit Profile
              </Button>
            </div>
            
            {/* Customer name and subtitle */}
            <div className="mt-3">
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold tracking-tight">{customer.name}</h2>
                {projectCount > 0 && <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />}
              </div>
              <p className="text-muted-foreground mt-0.5 flex items-center gap-1.5">
                <Building2 className="h-4 w-4" />
                {customer.industry || "Organization"}
                {customer.createdAt && ` • Since ${new Date(customer.createdAt).getFullYear()}`}
              </p>
            </div>
            
            {/* Removed project count section */}
            
            <Tabs defaultValue="about" className="mb-8">
              <TabsList className="mb-4">
                <TabsTrigger value="about">About</TabsTrigger>
                <TabsTrigger value="contact">Contact</TabsTrigger>
                <TabsTrigger value="projects">Projects</TabsTrigger>
              </TabsList>
              
              <TabsContent value="about">
                <div className="space-y-6">
                  {/* Description */}
                  {customer.description && (
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Description</h3>
                      <p className="text-muted-foreground">{customer.description}</p>
                    </div>
                  )}
                  
                  {/* Background information */}
                  {customer.backgroundInfo && (
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Background</h3>
                      <p className="text-muted-foreground whitespace-pre-line">{customer.backgroundInfo}</p>
                    </div>
                  )}
                  
                  {/* Industry tags */}
                  {industries.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Industries</h3>
                      <div className="flex flex-wrap gap-2">
                        {industries.map((industry, i) => (
                          <Badge key={i} variant="secondary">
                            {industry}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Timestamps */}
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Additional Information</h3>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>Created: {formattedCreatedAt}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>Last updated: {formattedUpdatedAt}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="contact">
                <div className="space-y-4">
                  {customer.website && (
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-1">Website</h3>
                      <div className="flex items-center gap-2 font-medium">
                        <Globe className="h-4 w-4 text-primary" />
                        <a 
                          href={customer.website.startsWith('http') ? customer.website : `https://${customer.website}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="hover:underline"
                        >
                          {customer.website}
                          <ExternalLink className="ml-1 inline-block h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  )}
                  
                  {customer.contactEmail && (
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-1">Email Address</h3>
                      <div className="flex items-center gap-2 font-medium">
                        <Mail className="h-4 w-4 text-primary" />
                        <a 
                          href={`mailto:${customer.contactEmail}`} 
                          className="hover:underline"
                        >
                          {customer.contactEmail}
                        </a>
                      </div>
                    </div>
                  )}
                  
                  {customer.contactPhone && (
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-1">Phone Number</h3>
                      <div className="flex items-center gap-2 font-medium">
                        <Phone className="h-4 w-4 text-primary" />
                        <a 
                          href={`tel:${customer.contactPhone}`} 
                          className="hover:underline"
                        >
                          {customer.contactPhone}
                        </a>
                      </div>
                    </div>
                  )}
                  
                  {!customer.website && !customer.contactEmail && !customer.contactPhone && (
                    <div className="py-8 text-center">
                      <div className="text-muted-foreground">
                        No contact information available
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="projects">
                {projectCount === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <h4 className="text-lg font-medium mb-2">No projects yet</h4>
                    <p className="text-muted-foreground mb-4">
                      This customer doesn't have any projects.
                    </p>
                    <Button onClick={handleOpenProjectForm}>Create a project</Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {customer.projects?.map((project) => (
                      <Link href={`/projects/${project.id}`} key={project.id}>
                        <Card className="overflow-hidden hover:shadow-md transition-all cursor-pointer">
                          <CardContent className="p-0">
                            <div className="flex items-center justify-between p-4">
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                  <File className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                  <div className="font-medium">{project.name}</div>
                                  <div className="text-xs text-muted-foreground">{project.type}</div>
                                </div>
                              </div>
                              <ChevronRight className="h-5 w-5 text-muted-foreground" />
                            </div>
                            
                            {project.description && (
                              <div className="px-4 pb-3">
                                <p className="text-sm text-muted-foreground line-clamp-1">
                                  {project.description}
                                </p>
                              </div>
                            )}
                            
                            <div className="px-4 pb-4 flex items-center gap-4">
                              {project.sourceSystem && project.targetSystem && (
                                <Badge variant="outline" className="mr-auto">
                                  {project.sourceSystem} → {project.targetSystem}
                                </Badge>
                              )}
                              
                              <Badge variant="secondary" className="text-xs">
                                {project.type || "Project"}
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </Card>
        
        {/* Quick actions */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Quick Actions</CardTitle>
              <CardDescription>Common tasks for this customer</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                className="w-full justify-start" 
                variant="outline" 
                onClick={handleOpenProjectForm}
              >
                <FileText className="mr-2 h-4 w-4" />
                Create New Project
              </Button>
              
              <Button className="w-full justify-start" variant="outline">
                <Mail className="mr-2 h-4 w-4" />
                Send Email
              </Button>
              
              <Button className="w-full justify-start" variant="outline" onClick={() => setEditDialogOpen(true)}>
                <Edit2 className="mr-2 h-4 w-4" />
                Edit Profile
              </Button>
            </CardContent>
          </Card>
          
          {/* Recent Activity */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Recent Activity</CardTitle>
              <CardDescription>Latest updates and changes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">New project created</p>
                    <p className="text-xs text-muted-foreground">{formattedCreatedAt}</p>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <Edit2 className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Profile updated</p>
                    <p className="text-xs text-muted-foreground">{formattedUpdatedAt}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Edit dialog */}
      <CustomerDialog
        isOpen={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        customer={customer}
      />
      
      {/* Project form dialog */}
      <ProjectForm
        isOpen={projectFormOpen}
        onClose={() => {
          setProjectFormOpen(false);
          // Invalidate both the customer and projects queries to refresh the data
          queryClient.invalidateQueries({ queryKey: [`/api/customers/${customer.id}`] });
          queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
        }}
      />
    </>
  );
}