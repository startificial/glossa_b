import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "../components/ui/button";
import { EnhancedCustomerDetail } from "../components/customers/enhanced-customer-detail";
import { Customer } from "../lib/types";
import { ChevronLeft } from "lucide-react";

interface CustomerDetailPageProps {
  customerId: number;
}

export default function CustomerDetail({ customerId }: CustomerDetailPageProps) {
  // Fetch customer data
  const { 
    data, 
    isLoading, 
    isError 
  } = useQuery<{[key: string]: any}>({
    queryKey: [`/api/customers/${customerId}`],
    staleTime: 60000, // 1 minute
  });
  
  const customer = data as Customer;
  
  // Fetch related projects (optional - our customer already has projects via join)
  
  return (
    <div className="container mx-auto py-6 max-w-7xl">
      
      {isLoading ? (
        <div className="space-y-4">
          <div className="h-12 bg-muted rounded-md animate-pulse w-1/3" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="h-96 md:col-span-2 bg-muted rounded-md animate-pulse" />
            <div className="h-64 bg-muted rounded-md animate-pulse" />
          </div>
        </div>
      ) : isError ? (
        <div className="py-12 text-center">
          <h2 className="text-xl font-semibold mb-2">Error loading customer</h2>
          <p className="text-muted-foreground mb-6">
            There was a problem loading the customer information.
          </p>
          <div className="flex gap-2 justify-center">
            <Button onClick={() => window.location.reload()}>Retry</Button>
            <Link href="/customers">
              <Button variant="outline">Go back to Customers</Button>
            </Link>
          </div>
        </div>
      ) : customer ? (
        <EnhancedCustomerDetail customer={customer} />
      ) : (
        <div className="py-12 text-center">
          <h2 className="text-xl font-semibold mb-2">Customer not found</h2>
          <p className="text-muted-foreground mb-6">
            The customer you're looking for doesn't exist or has been removed.
          </p>
          <Link href="/customers">
            <Button>Go back to Customers</Button>
          </Link>
        </div>
      )}
    </div>
  );
}