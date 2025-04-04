import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Customer } from "@/lib/types";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Globe, Mail, Phone, ExternalLink } from "lucide-react";

interface CustomerInfoCardProps {
  customerId: number;
}

export function CustomerInfoCard({ customerId }: CustomerInfoCardProps) {
  const { data: customer, isLoading } = useQuery<Customer>({
    queryKey: [`/api/customers/${customerId}`],
    enabled: !!customerId,
  });

  if (isLoading) {
    return (
      <Card className="w-full bg-white dark:bg-gray-800 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Skeleton className="h-5 w-40" />
          </CardTitle>
          <CardDescription>
            <Skeleton className="h-4 w-60" />
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!customer) {
    return null;
  }

  return (
    <Card className="w-full bg-white dark:bg-gray-800 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary/80" />
          {customer.name}
        </CardTitle>
        <CardDescription>
          {customer.industry || "Industry not specified"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 text-sm">
          {customer.description && (
            <p className="text-gray-600 dark:text-gray-400">
              {customer.description}
            </p>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2">
            {customer.website && (
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-gray-500" />
                <a 
                  href={customer.website.startsWith('http') ? customer.website : `https://${customer.website}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {customer.website}
                </a>
              </div>
            )}
            
            {customer.contactEmail && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-gray-500" />
                <a 
                  href={`mailto:${customer.contactEmail}`}
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {customer.contactEmail}
                </a>
              </div>
            )}
            
            {customer.contactPhone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-gray-500" />
                <a 
                  href={`tel:${customer.contactPhone}`}
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {customer.contactPhone}
                </a>
              </div>
            )}
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-0">
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full" 
          asChild
        >
          <Link to={`/customers/${customer.id}`}>
            <ExternalLink className="mr-2 h-4 w-4" />
            View Customer Details
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}