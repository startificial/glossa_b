import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Customer } from "@/lib/types";
import { 
  Card, 
  CardContent,
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
      <Card className="w-full bg-white dark:bg-gray-800 shadow-sm mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-gray-400" />
                <Skeleton className="h-6 w-40" />
              </div>
              <Skeleton className="h-4 w-32 mt-2" />
            </div>
            <div className="flex-1">
              <Skeleton className="h-4 w-full" />
            </div>
            <div className="flex-1 flex md:justify-end">
              <Skeleton className="h-9 w-44" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!customer) {
    return null;
  }

  return (
    <Card className="w-full bg-white dark:bg-gray-800 shadow-sm mb-6">
      <CardContent className="p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Left side: Customer name and industry */}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary/80" />
              <h3 className="text-lg font-medium">
                {customer.name}
              </h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {customer.industry || "Industry not specified"}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-3 md:max-h-[72px] overflow-hidden">
              {customer.description}
            </p>
          </div>
          
          {/* Middle: Contact information */}
          <div className="flex-1 space-y-1">
            {customer.website && (
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-gray-500" />
                <a 
                  href={customer.website.startsWith('http') ? customer.website : `https://${customer.website}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
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
                  className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
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
                  className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
                >
                  {customer.contactPhone}
                </a>
              </div>
            )}
          </div>
          
          {/* Right side: Action button */}
          <div className="flex-1 flex md:justify-end">
            <Button 
              variant="outline" 
              size="sm"
              asChild
            >
              <Link to={`/customers/${customer.id}`}>
                <ExternalLink className="mr-2 h-4 w-4" />
                View Customer Details
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}