import { useState, useEffect } from "react";
import { RequirementsFilter as FilterType } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";

interface RequirementsFilterProps {
  onFilterChange: (filter: FilterType) => void;
}

export function RequirementsFilter({ onFilterChange }: RequirementsFilterProps) {
  const [filter, setFilter] = useState<FilterType>({});
  const [searchQuery, setSearchQuery] = useState('');
  
  // Debounce search input to avoid excessive filtering
  useEffect(() => {
    const timer = setTimeout(() => {
      onFilterChange({
        ...filter,
        search: searchQuery
      });
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchQuery]);
  
  const handleFilterChange = (key: keyof FilterType, value: string | undefined) => {
    const newFilter = { ...filter };
    
    if (value === undefined || 
        value === 'all_categories' || 
        value === 'all_priorities' || 
        value === 'all_sources') {
      delete newFilter[key];
    } else {
      newFilter[key] = value;
    }
    
    setFilter(newFilter);
    onFilterChange({
      ...newFilter,
      search: searchQuery
    });
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
          <div className="w-full sm:w-64">
            <Label htmlFor="search" className="sr-only">Search</Label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <Input
                type="text"
                id="search"
                placeholder="Search requirements"
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <Label htmlFor="category" className="sr-only">Filter by Category</Label>
              <Select
                value={filter.category || "all_categories"}
                onValueChange={(value) => handleFilterChange('category', value)}
              >
                <SelectTrigger id="category" className="w-[150px]">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_categories">All Categories</SelectItem>
                  <SelectItem value="functional">Functional</SelectItem>
                  <SelectItem value="non-functional">Non-Functional</SelectItem>
                  <SelectItem value="security">Security</SelectItem>
                  <SelectItem value="performance">Performance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="priority" className="sr-only">Filter by Priority</Label>
              <Select
                value={filter.priority || "all_priorities"}
                onValueChange={(value) => handleFilterChange('priority', value)}
              >
                <SelectTrigger id="priority" className="w-[150px]">
                  <SelectValue placeholder="All Priorities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_priorities">All Priorities</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="source" className="sr-only">Filter by Source</Label>
              <Select
                value={filter.source || "all_sources"}
                onValueChange={(value) => handleFilterChange('source', value)}
              >
                <SelectTrigger id="source" className="w-[150px]">
                  <SelectValue placeholder="All Sources" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_sources">All Sources</SelectItem>
                  <SelectItem value="Client Interview">Client Interview</SelectItem>
                  <SelectItem value="User Feedback">User Feedback</SelectItem>
                  <SelectItem value="Stakeholder Meeting">Stakeholder Meeting</SelectItem>
                  <SelectItem value="Security Assessment">Security Assessment</SelectItem>
                  <SelectItem value="Manual">Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
