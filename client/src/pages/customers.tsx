import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Customer } from "../lib/types";
import { CustomerCard } from "../components/customers/customer-card";
import { EnhancedCustomerCard } from "../components/customers/enhanced-customer-card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Plus, Search } from "lucide-react";
import { PageHeader, PageHeaderHeading, PageHeaderDescription } from "../components/ui/page-header";
import { CustomerDialog } from "../components/customers/customer-dialog";

export default function Customers() {
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const { data: customers, isLoading, isError } = useQuery<Customer[]>({
    queryKey: ['/api/customers'],
    staleTime: 60000, // 1 minute
  });
  
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
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Customer
            </Button>
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
            <p className="text-muted-foreground mb-4">There was an error loading the customers. Please try again.</p>
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
        
        <CustomerDialog 
          isOpen={dialogOpen} 
          onClose={() => setDialogOpen(false)}
        />
      </div>
    </div>
  );
}