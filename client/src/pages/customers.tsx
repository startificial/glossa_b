import React, { useState, useEffect } from "react";
import { Customer } from "../lib/types";
import { CustomerCard } from "../components/customers/customer-card";
import { EnhancedCustomerCard } from "../components/customers/enhanced-customer-card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Plus, Search } from "lucide-react";
import { PageHeader, PageHeaderHeading, PageHeaderDescription } from "../components/ui/page-header";
import { CustomerDialog } from "../components/customers/customer-dialog";
import { useCustomers } from "@/hooks/use-customers";
import { useToast } from "@/hooks/use-toast";

export default function Customers() {
  console.log('[CUSTOMERS-PAGE] Component rendering');
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<any>(null);
  
  // Function to test API connectivity
  const testApiConnection = async () => {
    try {
      console.log('[CUSTOMERS-PAGE] Testing API connectivity...');
      const response = await fetch('/api/test-customer-query');
      const data = await response.json();
      console.log('[CUSTOMERS-PAGE] Test API response:', data);
      setTestResults(data);
      toast({
        title: "Test successful",
        description: `Found ${data.customersFound} customers. First customer: ${data.firstCustomer}`,
      });
    } catch (error) {
      console.error('[CUSTOMERS-PAGE] Test API error:', error);
      setTestResults({ error: String(error) });
      toast({
        title: "Test failed",
        description: String(error),
        variant: "destructive"
      });
    }
  };
  
  // Query for customer data using our custom hook
  console.log('[CUSTOMERS-PAGE] About to call useCustomers hook');
  const { 
    customers, 
    isLoading, 
    isError, 
    error,
    refetch
  } = useCustomers();
  
  console.log('[CUSTOMERS-PAGE] useCustomers hook returned:', {
    customersLength: customers?.length || 0,
    isLoading,
    isError,
    errorMessage: error ? (error as Error).message : 'none'
  });
  
  // Effect to handle errors and logging
  useEffect(() => {
    if (isError && error) {
      console.error('Customer query error:', error);
      setErrorDetails((error as Error).message || 'Unknown error occurred');
      toast({
        title: "Error loading customers",
        description: (error as Error).message || "Failed to load customers. Please try again.",
        variant: "destructive"
      });
    } else if (customers) {
      console.log('Customer data loaded successfully:', customers.length || 0, 'customers found');
    }
  }, [isError, error, customers, toast]);
  
  // Filter customers based on search query
  const filteredCustomers = searchQuery.trim() === ""
    ? customers
    : customers?.filter((customer) => 
        customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (customer.industry && customer.industry.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (customer.description && customer.description.toLowerCase().includes(searchQuery.toLowerCase()))
      );
  
  return (
    <div className="flex">
      {/* Add left padding to create space from side drawer */}
      <div className="flex-1 p-6 overflow-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
          <PageHeader>
            <PageHeaderHeading>Customers</PageHeaderHeading>
            <PageHeaderDescription>
              Manage and view all your customer accounts.
            </PageHeaderDescription>
          </PageHeader>
          
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search customers..."
                className="pl-8 w-full sm:w-[250px]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Customer
              </Button>
              <Button onClick={testApiConnection} variant="outline">
                Test API
              </Button>
            </div>
          </div>
        </div>
      
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-muted h-64 rounded-md animate-pulse" />
            ))}
          </div>
        ) : isError ? (
          <div className="py-12 text-center">
            <h3 className="text-lg font-medium mb-2">Failed to load customers</h3>
            <p className="text-muted-foreground mb-4">There was an error loading the customers. Our team has been notified.</p>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </div>
        ) : filteredCustomers && filteredCustomers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCustomers.map((customer) => (
              <EnhancedCustomerCard key={customer.id} customer={customer} />
            ))}
          </div>
        ) : (
          <div className="py-12 text-center bg-muted rounded-lg">
            {searchQuery.trim() !== "" ? (
              <>
                <h3 className="text-lg font-medium mb-2">No matching customers</h3>
                <p className="text-muted-foreground">
                  No customers match your search query. Try different keywords or clear the search.
                </p>
              </>
            ) : (
              <>
                <h3 className="text-lg font-medium mb-2">No customers yet</h3>
                <p className="text-muted-foreground mb-4">
                  Get started by adding your first customer.
                </p>
                <Button onClick={() => setDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Customer
                </Button>
              </>
            )}
          </div>
        )}
        
        {/* Show test results if available */}
        {testResults && (
          <div className="mt-6 p-4 border rounded-md bg-background">
            <h3 className="text-lg font-medium mb-2">API Test Results</h3>
            <pre className="text-sm bg-muted p-3 rounded-md overflow-auto max-h-[300px]">
              {JSON.stringify(testResults, null, 2)}
            </pre>
          </div>
        )}
        
        <CustomerDialog 
          isOpen={dialogOpen} 
          onClose={() => setDialogOpen(false)}
        />
      </div>
    </div>
  );
}