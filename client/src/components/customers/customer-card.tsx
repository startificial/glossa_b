import { Link } from "wouter";
import { formatRelativeTime } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Customer } from "@/lib/types";
import { BuildingIcon } from "lucide-react";

interface CustomerCardProps {
  customer: Customer;
  className?: string;
}

export function CustomerCard({ customer, className = "" }: CustomerCardProps) {
  return (
    <Link href={`/customers/${customer.id}`}>
      <Card className={`h-full hover:shadow-md transition-shadow ${className}`}>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div className="flex items-center">
              <BuildingIcon className="h-5 w-5 text-primary mr-2" />
              <CardTitle className="text-lg">{customer.name}</CardTitle>
            </div>
            <div className="text-xs text-muted-foreground">
              {formatRelativeTime(customer.updatedAt)}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {customer.description || "No description provided."}
          </p>
          
          <div className="grid grid-cols-2 gap-2 mb-3">
            {customer.industry && (
              <div className="flex items-center text-xs text-muted-foreground">
                <span className="font-medium mr-1">Industry:</span>
                <span>{customer.industry}</span>
              </div>
            )}
            
            {customer.website && (
              <div className="flex items-center text-xs text-muted-foreground">
                <span className="font-medium mr-1">Website:</span>
                <a 
                  href={customer.website} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  Visit
                </a>
              </div>
            )}
          </div>
          
          {customer.backgroundInfo && (
            <div className="mb-3">
              <h4 className="text-xs font-medium mb-1">Background</h4>
              <p className="text-xs text-muted-foreground line-clamp-3">
                {customer.backgroundInfo}
              </p>
            </div>
          )}
          
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            {customer.contactEmail && (
              <div className="inline-flex items-center px-2 py-1 rounded-full bg-primary/10 text-primary">
                {customer.contactEmail}
              </div>
            )}
            {customer.contactPhone && (
              <div className="inline-flex items-center px-2 py-1 rounded-full bg-primary/10 text-primary">
                {customer.contactPhone}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}