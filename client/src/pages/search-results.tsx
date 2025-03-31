import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useRoute, Link } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Search, Calendar as CalendarIcon, FileText, Folder, CheckSquare, X } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { 
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface SearchResult {
  projects: any[];
  requirements: any[];
  inputData: any[];
  tasks: any[];
  totalResults: number;
  totalPages: number;
}

export function SearchResults() {
  const [_, params] = useRoute("/search");
  const [location] = useLocation();
  const searchParams = new URLSearchParams(location.split('?')[1] || '');
  const initialQuery = searchParams.get('q') || '';
  
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState("all");
  const [page, setPage] = useState(1);
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>(undefined);
  const [priorityFilter, setPriorityFilter] = useState<string | undefined>(undefined);
  const [fromDate, setFromDate] = useState<Date | undefined>(undefined);
  const [toDate, setToDate] = useState<Date | undefined>(undefined);
  
  // Map entity type to tab value
  const getEntityTypeFromTab = (): string[] => {
    switch (activeTab) {
      case 'projects': return ['projects'];
      case 'requirements': return ['requirements'];
      case 'input-data': return ['inputData'];
      case 'tasks': return ['tasks'];
      default: return ['projects', 'requirements', 'inputData', 'tasks'];
    }
  };
  
  // Build search URL
  const buildSearchUrl = () => {
    const params = new URLSearchParams();
    params.append('q', searchQuery);
    params.append('page', page.toString());
    params.append('limit', '10');
    
    const entityTypes = getEntityTypeFromTab();
    if (entityTypes.length > 0) {
      params.append('entityTypes', entityTypes.join(','));
    }
    
    if (categoryFilter) {
      params.append('category', categoryFilter);
    }
    
    if (priorityFilter) {
      params.append('priority', priorityFilter);
    }
    
    if (fromDate) {
      params.append('fromDate', fromDate.toISOString());
    }
    
    if (toDate) {
      params.append('toDate', toDate.toISOString());
    }
    
    return `/api/search/advanced?${params.toString()}`;
  };
  
  // Query for search results
  const { 
    data: searchResults, 
    isLoading,
    refetch
  } = useQuery<SearchResult>({
    queryKey: ['/api/search/advanced', searchQuery, activeTab, page, categoryFilter, priorityFilter, fromDate, toDate],
    queryFn: async () => {
      if (!searchQuery.trim()) return {
        projects: [],
        requirements: [],
        inputData: [],
        tasks: [],
        totalResults: 0,
        totalPages: 0
      };
      
      const response = await fetch(buildSearchUrl());
      if (!response.ok) {
        throw new Error('Search failed');
      }
      return response.json();
    },
    enabled: searchQuery.trim().length > 0,
  });
  
  // Handle search submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1); // Reset to first page
    refetch();
  };
  
  // Clear all filters
  const clearFilters = () => {
    setCategoryFilter(undefined);
    setPriorityFilter(undefined);
    setFromDate(undefined);
    setToDate(undefined);
    setPage(1);
  };
  
  // Update URL when search params change
  useEffect(() => {
    if (searchQuery) {
      const newParams = new URLSearchParams();
      newParams.append('q', searchQuery);
      if (activeTab !== 'all') {
        newParams.append('tab', activeTab);
      }
      
      window.history.replaceState(
        {},
        '',
        `${window.location.pathname}?${newParams.toString()}`
      );
    }
  }, [searchQuery, activeTab]);
  
  // Format date range for display
  const getFormattedDateRange = () => {
    if (fromDate && toDate) {
      return `${format(fromDate, 'PP')} - ${format(toDate, 'PP')}`;
    } else if (fromDate) {
      return `From ${format(fromDate, 'PP')}`;
    } else if (toDate) {
      return `Until ${format(toDate, 'PP')}`;
    }
    return "Select date range";
  };
  
  return (
    <div className="container py-6 space-y-6">
      <PageHeader title="Search Results" description="Find projects, requirements, input data, and tasks" />
      
      <div className="grid gap-10 md:grid-cols-[300px_1fr]">
        {/* Filters sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Search</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSearch} className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                  <Input
                    type="search"
                    placeholder="Search..."
                    className="pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full">Search</Button>
              </form>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Filters</CardTitle>
              <div className="flex justify-between items-center">
                <CardDescription>Refine your results</CardDescription>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={clearFilters}
                  className="h-7 px-2"
                >
                  <X className="h-3.5 w-3.5 mr-1" />
                  Clear
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="functional">Functional</SelectItem>
                    <SelectItem value="non-functional">Non-Functional</SelectItem>
                    <SelectItem value="security">Security</SelectItem>
                    <SelectItem value="performance">Performance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Priority</label>
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Priorities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Date Range</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !fromDate && !toDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {getFormattedDateRange()}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="flex w-auto flex-col space-y-2 p-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">From</label>
                      <Calendar
                        mode="single"
                        selected={fromDate}
                        onSelect={setFromDate}
                        initialFocus
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">To</label>
                      <Calendar
                        mode="single"
                        selected={toDate}
                        onSelect={setToDate}
                        initialFocus
                      />
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Results area */}
        <div className="space-y-4 pl-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5 px-2">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="projects">Projects</TabsTrigger>
              <TabsTrigger value="requirements">Requirements</TabsTrigger>
              <TabsTrigger value="input-data">Input Data</TabsTrigger>
              <TabsTrigger value="tasks">Tasks</TabsTrigger>
            </TabsList>
            
            <div className="mt-6 px-2">
              {/* Loading state */}
              {isLoading && (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <p className="mt-2 text-gray-500">Loading results...</p>
                </div>
              )}
              
              {/* No results state */}
              {!isLoading && searchResults && searchResults.totalResults === 0 && (
                <div className="text-center py-8">
                  <Search className="h-12 w-12 mx-auto text-gray-400" />
                  <h3 className="mt-4 text-lg font-medium">No results found</h3>
                  <p className="mt-1 text-gray-500">
                    Try adjusting your search or filters to find what you're looking for.
                  </p>
                </div>
              )}
              
              {/* Results */}
              {!isLoading && searchResults && searchResults.totalResults > 0 && (
                <>
                  <TabsContent value="all" className="space-y-6">
                    {/* Projects */}
                    {searchResults.projects.length > 0 && (
                      <div>
                        <h3 className="text-lg font-medium mb-3">Projects</h3>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                          {searchResults.projects.map(project => (
                            <Card key={`project-${project.id}`}>
                              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                                <div>
                                  <CardTitle className="text-base">
                                    <Link href={`/projects/${project.id}`} className="hover:underline">
                                      {project.name}
                                    </Link>
                                  </CardTitle>
                                  <CardDescription>{project.type}</CardDescription>
                                </div>
                                <Folder className="h-5 w-5 text-muted-foreground" />
                              </CardHeader>
                              <CardContent>
                                <p className="text-sm line-clamp-2">{project.description || "No description"}</p>
                              </CardContent>
                              <CardFooter className="text-xs text-gray-500">
                                Created: {new Date(project.createdAt).toLocaleDateString()}
                              </CardFooter>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Requirements */}
                    {searchResults.requirements.length > 0 && (
                      <div>
                        <h3 className="text-lg font-medium mb-3">Requirements</h3>
                        <div className="space-y-4">
                          {searchResults.requirements.map(req => (
                            <Card key={`req-${req.id}`}>
                              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                                <div>
                                  <CardTitle className="text-base flex items-center">
                                    <Link href={`/projects/${req.projectId}/requirements/${req.id}`} className="hover:underline">
                                      {req.codeId}
                                    </Link>
                                    <span className="ml-2 text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full">
                                      {req.category}
                                    </span>
                                    <span className="ml-2 text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-full">
                                      {req.priority}
                                    </span>
                                  </CardTitle>
                                </div>
                                <FileText className="h-5 w-5 text-muted-foreground" />
                              </CardHeader>
                              <CardContent>
                                <p className="text-sm line-clamp-3">{req.text}</p>
                              </CardContent>
                              <CardFooter className="text-xs text-gray-500">
                                Project: <Link href={`/projects/${req.projectId}`} className="hover:underline ml-1">
                                  {searchResults.projects.find(p => p.id === req.projectId)?.name || `Project ${req.projectId}`}
                                </Link>
                              </CardFooter>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Input Data */}
                    {searchResults.inputData.length > 0 && (
                      <div>
                        <h3 className="text-lg font-medium mb-3">Input Data</h3>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                          {searchResults.inputData.map(data => (
                            <Card key={`data-${data.id}`}>
                              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                                <div>
                                  <CardTitle className="text-base">
                                    <Link href={`/projects/${data.projectId}`} className="hover:underline">
                                      {data.name}
                                    </Link>
                                  </CardTitle>
                                  <CardDescription>{data.type}</CardDescription>
                                </div>
                                <div className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-full">
                                  {data.status}
                                </div>
                              </CardHeader>
                              <CardContent>
                                <p className="text-sm">
                                  Size: {(data.size / 1024).toFixed(2)} KB • Type: {data.contentType || "Unknown"}
                                </p>
                              </CardContent>
                              <CardFooter className="text-xs text-gray-500">
                                Uploaded: {new Date(data.createdAt).toLocaleDateString()}
                              </CardFooter>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Tasks */}
                    {searchResults.tasks.length > 0 && (
                      <div>
                        <h3 className="text-lg font-medium mb-3">Tasks</h3>
                        <div className="space-y-4">
                          {searchResults.tasks.map(task => (
                            <Card key={`task-${task.id}`}>
                              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                                <div>
                                  <CardTitle className="text-base flex items-center">
                                    <Link href={`/tasks/${task.id}`} className="hover:underline">
                                      {task.title}
                                    </Link>
                                    <span className="ml-2 text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-full">
                                      {task.priority}
                                    </span>
                                    <span className="ml-2 text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full">
                                      {task.status}
                                    </span>
                                  </CardTitle>
                                  {task.assignee && (
                                    <CardDescription>Assigned to: {task.assignee}</CardDescription>
                                  )}
                                </div>
                                <CheckSquare className="h-5 w-5 text-muted-foreground" />
                              </CardHeader>
                              <CardContent>
                                <p className="text-sm line-clamp-2">{task.description}</p>
                              </CardContent>
                              <CardFooter className="text-xs text-gray-500">
                                Requirement: <Link href={`/projects/${searchResults.requirements.find(r => r.id === task.requirementId)?.projectId}/requirements/${task.requirementId}`} className="hover:underline ml-1">
                                  View Requirement
                                </Link>
                              </CardFooter>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}
                  </TabsContent>
                  
                  {/* Individual entity type tabs */}
                  <TabsContent value="projects">
                    {searchResults.projects.length > 0 ? (
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {searchResults.projects.map(project => (
                          <Card key={`project-${project.id}`}>
                            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                              <div>
                                <CardTitle className="text-base">
                                  <Link href={`/projects/${project.id}`} className="hover:underline">
                                    {project.name}
                                  </Link>
                                </CardTitle>
                                <CardDescription>{project.type}</CardDescription>
                              </div>
                              <Folder className="h-5 w-5 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                              <p className="text-sm line-clamp-2">{project.description || "No description"}</p>
                            </CardContent>
                            <CardFooter className="text-xs text-gray-500">
                              Created: {new Date(project.createdAt).toLocaleDateString()}
                            </CardFooter>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Folder className="h-12 w-12 mx-auto text-gray-400" />
                        <p className="mt-2 text-gray-500">No projects found</p>
                      </div>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="requirements">
                    {searchResults.requirements.length > 0 ? (
                      <div className="space-y-4">
                        {searchResults.requirements.map(req => (
                          <Card key={`req-${req.id}`}>
                            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                              <div>
                                <CardTitle className="text-base flex items-center">
                                  <Link href={`/projects/${req.projectId}/requirements/${req.id}`} className="hover:underline">
                                    {req.codeId}
                                  </Link>
                                  <span className="ml-2 text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full">
                                    {req.category}
                                  </span>
                                  <span className="ml-2 text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-full">
                                    {req.priority}
                                  </span>
                                </CardTitle>
                              </div>
                              <FileText className="h-5 w-5 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                              <p className="text-sm line-clamp-3">{req.text}</p>
                            </CardContent>
                            <CardFooter className="text-xs text-gray-500">
                              Project: <Link href={`/projects/${req.projectId}`} className="hover:underline ml-1">
                                {searchResults.projects.find(p => p.id === req.projectId)?.name || `Project ${req.projectId}`}
                              </Link>
                            </CardFooter>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <FileText className="h-12 w-12 mx-auto text-gray-400" />
                        <p className="mt-2 text-gray-500">No requirements found</p>
                      </div>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="input-data">
                    {searchResults.inputData.length > 0 ? (
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {searchResults.inputData.map(data => (
                          <Card key={`data-${data.id}`}>
                            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                              <div>
                                <CardTitle className="text-base">
                                  <Link href={`/projects/${data.projectId}`} className="hover:underline">
                                    {data.name}
                                  </Link>
                                </CardTitle>
                                <CardDescription>{data.type}</CardDescription>
                              </div>
                              <div className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-full">
                                {data.status}
                              </div>
                            </CardHeader>
                            <CardContent>
                              <p className="text-sm">
                                Size: {(data.size / 1024).toFixed(2)} KB • Type: {data.contentType || "Unknown"}
                              </p>
                            </CardContent>
                            <CardFooter className="text-xs text-gray-500">
                              Uploaded: {new Date(data.createdAt).toLocaleDateString()}
                            </CardFooter>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <FileText className="h-12 w-12 mx-auto text-gray-400" />
                        <p className="mt-2 text-gray-500">No input data files found</p>
                      </div>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="tasks">
                    {searchResults.tasks.length > 0 ? (
                      <div className="space-y-4">
                        {searchResults.tasks.map(task => (
                          <Card key={`task-${task.id}`}>
                            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                              <div>
                                <CardTitle className="text-base flex items-center">
                                  <Link href={`/tasks/${task.id}`} className="hover:underline">
                                    {task.title}
                                  </Link>
                                  <span className="ml-2 text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-full">
                                    {task.priority}
                                  </span>
                                  <span className="ml-2 text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full">
                                    {task.status}
                                  </span>
                                </CardTitle>
                                {task.assignee && (
                                  <CardDescription>Assigned to: {task.assignee}</CardDescription>
                                )}
                              </div>
                              <CheckSquare className="h-5 w-5 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                              <p className="text-sm line-clamp-2">{task.description}</p>
                            </CardContent>
                            <CardFooter className="text-xs text-gray-500">
                              Requirement: <Link href={`/projects/${searchResults.requirements.find(r => r.id === task.requirementId)?.projectId}/requirements/${task.requirementId}`} className="hover:underline ml-1">
                                View Requirement
                              </Link>
                            </CardFooter>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <CheckSquare className="h-12 w-12 mx-auto text-gray-400" />
                        <p className="mt-2 text-gray-500">No tasks found</p>
                      </div>
                    )}
                  </TabsContent>
                  
                  {/* Pagination */}
                  {searchResults.totalPages > 1 && (
                    <div className="mt-6">
                      <Pagination>
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious 
                              onClick={() => setPage(p => Math.max(1, p - 1))}
                              className={page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                            />
                          </PaginationItem>
                          
                          {/* Current page display */}
                          <PaginationItem>
                            <span className="px-4 py-2">
                              Page {page} of {searchResults.totalPages}
                            </span>
                          </PaginationItem>
                          
                          <PaginationItem>
                            <PaginationNext 
                              onClick={() => setPage(p => Math.min(searchResults.totalPages, p + 1))}
                              className={page === searchResults.totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                            />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    </div>
                  )}
                </>
              )}
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
}