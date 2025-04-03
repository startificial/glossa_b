import { formatDate } from "@/lib/utils";
import { Customer } from "@/lib/types";
import { BuildingIcon, GlobeIcon, MailIcon, PhoneIcon, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface CustomerDetailProps {
  customer: Customer;
}

export function CustomerDetail({ customer }: CustomerDetailProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-primary/5 pb-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center">
            <BuildingIcon className="h-6 w-6 text-primary mr-2" />
            <CardTitle className="text-xl">{customer.name}</CardTitle>
          </div>
          {customer.industry && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
              {customer.industry}
            </span>
          )}
        </div>
        
        {customer.description && (
          <p className="text-sm text-muted-foreground">
            {customer.description}
          </p>
        )}
      </CardHeader>
      
      <CardContent className="pt-6">
        {customer.backgroundInfo && (
          <div className="mb-6">
            <h3 className="text-sm font-medium mb-2">Background</h3>
            <p className="text-sm text-muted-foreground whitespace-pre-line">
              {customer.backgroundInfo}
            </p>
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium mb-3">Contact Information</h3>
            <div className="space-y-2">
              {customer.website && (
                <div className="flex items-center text-sm">
                  <GlobeIcon className="h-4 w-4 mr-2 text-muted-foreground" />
                  <a 
                    href={customer.website} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {customer.website.replace(/^https?:\/\//, '')}
                  </a>
                </div>
              )}
              
              {customer.contactEmail && (
                <div className="flex items-center text-sm">
                  <MailIcon className="h-4 w-4 mr-2 text-muted-foreground" />
                  <a 
                    href={`mailto:${customer.contactEmail}`}
                    className="text-primary hover:underline"
                  >
                    {customer.contactEmail}
                  </a>
                </div>
              )}
              
              {customer.contactPhone && (
                <div className="flex items-center text-sm">
                  <PhoneIcon className="h-4 w-4 mr-2 text-muted-foreground" />
                  <a 
                    href={`tel:${customer.contactPhone}`}
                    className="text-primary hover:underline"
                  >
                    {customer.contactPhone}
                  </a>
                </div>
              )}
            </div>
          </div>
          
          <div>
            <h3 className="text-sm font-medium mb-3">Timeline</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="font-medium mr-2">Created:</span>
                <span className="text-muted-foreground">
                  {formatDate(customer.createdAt)}
                </span>
              </div>
              
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="font-medium mr-2">Updated:</span>
                <span className="text-muted-foreground">
                  {formatDate(customer.updatedAt)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}