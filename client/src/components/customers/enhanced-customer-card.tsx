import { useState } from "react";
import { Link } from "wouter";
import { Customer } from "../../lib/types";
import { 
  Building2, 
  Star, 
  Link as LinkIcon,
  Mail, 
  Phone, 
  Edit2,
  ExternalLink,
  CheckCircle2,
  FileText,
  Users,
  PieChart
} from "lucide-react";
import { 
  Card, 
  CardContent, 
  CardFooter, 
  CardHeader 
} from "../ui/card";
import { Button } from "../ui/button";
import { Separator } from "../ui/separator";
import { Badge } from "../ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { CustomerDialog } from "./customer-dialog";

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

interface EnhancedCustomerCardProps {
  customer: Customer;
  compact?: boolean;
}

export function EnhancedCustomerCard({ customer, compact = false }: EnhancedCustomerCardProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const projectCount = customer.projects?.length || 0;
  
  // Industries as tags
  const industries = customer.industry ? customer.industry.split(",").map(i => i.trim()) : [];
  
  // Avatar and banner
  const avatarFallback = generateAvatarFallback(customer.name);
  const bannerStyle = { background: generateBannerColor(customer.name) };
  
  return (
    <>
      <Card className="overflow-hidden transition-all hover:shadow-md">
        {/* Colorful banner header */}
        <div 
          className="h-28 w-full relative" 
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
            
            {/* Action buttons */}
            <div className="flex gap-2 mt-3">
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => setDialogOpen(true)}
                className="h-8 w-8"
              >
                <Edit2 className="h-4 w-4" />
              </Button>
              
              <Button
                variant="outline"
                size="icon"
                asChild
                className="h-8 w-8"
              >
                <Link to={`/customers/${customer.id}`}>
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
          
          {/* Customer name and subtitle */}
          <div className="mt-3">
            <div className="flex items-center gap-1.5">
              <h3 className="text-xl font-semibold">{customer.name}</h3>
              {projectCount > 0 && <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />}
            </div>
            <p className="text-muted-foreground mt-0.5 flex items-center">
              <Building2 className="mr-1.5 h-3.5 w-3.5" />
              {customer.industry || "Organization"}
              {customer.createdAt && ` • Since ${new Date(customer.createdAt).getFullYear()}`}
            </p>
          </div>
          
          {/* Projects Metric */}
          {!compact && (
            <div className="flex items-center justify-center my-4">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-muted-foreground">
                  <FileText className="h-3.5 w-3.5" />
                  <span className="text-xs">Projects</span>
                </div>
                <p className="font-semibold mt-1">{projectCount}</p>
              </div>
            </div>
          )}
          
          {/* Action buttons */}
          {!compact && (
            <div className="grid grid-cols-2 gap-2 my-4">
              <Button 
                variant="outline" 
                className="w-full justify-center" 
                asChild
              >
                <Link to={`/customers/${customer.id}`}>
                  View details
                </Link>
              </Button>
              
              {customer.website && (
                <Button
                  variant="outline"
                  className="w-full justify-center"
                  asChild
                >
                  <a 
                    href={customer.website.startsWith('http') ? customer.website : `https://${customer.website}`}
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    <LinkIcon className="mr-2 h-4 w-4" />
                    Website
                  </a>
                </Button>
              )}
            </div>
          )}
          
          {/* About section */}
          {!compact && customer.description && (
            <>
              <Separator className="my-3" />
              <div className="mb-4">
                <h4 className="text-sm font-medium mb-2">About</h4>
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {customer.description}
                </p>
              </div>
            </>
          )}
          
          {/* Industry tags */}
          {!compact && industries.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {industries.map((industry, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {industry}
                </Badge>
              ))}
            </div>
          )}
          
          {/* Contact details */}
          {!compact && (customer.contactEmail || customer.contactPhone) && (
            <CardFooter className="p-0 mb-4 flex flex-col items-start gap-2">
              {customer.contactEmail && (
                <div className="flex items-center text-sm text-muted-foreground">
                  <Mail className="h-3.5 w-3.5 mr-2" />
                  <a 
                    href={`mailto:${customer.contactEmail}`}
                    className="hover:underline"
                  >
                    {customer.contactEmail}
                  </a>
                </div>
              )}
              
              {customer.contactPhone && (
                <div className="flex items-center text-sm text-muted-foreground">
                  <Phone className="h-3.5 w-3.5 mr-2" />
                  <a 
                    href={`tel:${customer.contactPhone}`}
                    className="hover:underline"
                  >
                    {customer.contactPhone}
                  </a>
                </div>
              )}
            </CardFooter>
          )}
        </div>
      </Card>
      
      <CustomerDialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        customer={customer}
      />
    </>
  );
}