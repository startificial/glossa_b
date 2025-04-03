import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Customer } from "@/lib/types";
import { Building, ChevronRight, Star, Calendar, Users, BarChart } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface CustomerCardProps {
  customer: Customer;
  className?: string;
}

export function CustomerCard({ customer, className }: CustomerCardProps) {
  // Format the date for display
  const formattedDate = formatDistanceToNow(new Date(customer.createdAt), { addSuffix: true });
  
  // Calculate project count
  const projectCount = customer.projects?.length || 0;
  
  return (
    <Card className={`overflow-hidden ${className}`}>
      {/* Card header with decorative background */}
      <div className="h-20 bg-gradient-to-r from-primary/20 to-primary/30 relative">
        {/* Company logo/placeholder */}
        <div className="absolute -bottom-6 left-4 w-16 h-16 rounded-full bg-white border-2 border-white shadow flex items-center justify-center">
          <Building className="h-8 w-8 text-primary" />
        </div>
      </div>
      
      <CardHeader className="pt-8 pb-2">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-bold">{customer.name}</h3>
              {/* Star icon for featured/important customers */}
              {customer.projects && customer.projects.length > 2 && (
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              )}
            </div>
            <CardDescription className="text-sm">
              {customer.industry || "Industry not specified"}
            </CardDescription>
          </div>
          
          {/* Key metrics */}
          <div className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className="flex items-center text-muted-foreground mb-1">
                <Calendar className="h-3 w-3 mr-1" />
                <span className="text-xs">Projects</span>
              </div>
              <span className="font-medium text-sm">{customer.projects?.length || 0}</span>
            </div>
            
            <div className="flex flex-col items-center">
              <div className="flex items-center text-muted-foreground mb-1">
                <Users className="h-3 w-3 mr-1" />
                <span className="text-xs">Team</span>
              </div>
              <span className="font-medium text-sm">{customer.collaborators || 0}</span>
            </div>
            
            <div className="flex flex-col items-center">
              <div className="flex items-center text-muted-foreground mb-1">
                <BarChart className="h-3 w-3 mr-1" />
                <span className="text-xs">Success</span>
              </div>
              <span className="font-medium text-sm">{customer.successRate ? `${customer.successRate}%` : "N/A"}</span>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {/* About section */}
        {customer.description && (
          <div className="mb-4">
            <h4 className="text-sm font-semibold mb-1">About</h4>
            <p className="text-sm text-muted-foreground line-clamp-2">{customer.description}</p>
          </div>
        )}
        
        {/* Tags/info */}
        <div className="flex flex-wrap gap-2 mt-2">
          {customer.website && (
            <Badge variant="secondary">Website</Badge>
          )}
          {customer.contactEmail && (
            <Badge variant="secondary">Contact</Badge>
          )}
          {projectCount > 0 && (
            <Badge variant="outline" className="text-primary">
              {projectCount} {projectCount === 1 ? 'Project' : 'Projects'}
            </Badge>
          )}
          <Badge variant="outline" className="text-muted-foreground">
            Added {formattedDate}
          </Badge>
        </div>
      </CardContent>
      
      <CardFooter className="pt-0">
        <Link href={`/customers/${customer.id}`}>
          <Button variant="default" className="w-full" size="sm">
            View customer <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}