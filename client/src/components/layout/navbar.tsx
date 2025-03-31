import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { PlusIcon, Menu, Search, Settings, LogOut, User as UserIcon, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { ProjectForm } from "@/components/projects/project-form";
import glossaLogo from "../../assets/glossa-logo.png";
import { useQuery } from "@tanstack/react-query";
import { User, Project, Requirement } from "@/lib/types";
import { useAuth } from "@/hooks/use-auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface NavbarProps {
  toggleSidebar: () => void;
}

export function Navbar({ toggleSidebar }: NavbarProps) {
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [_, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchPopoverOpen, setIsSearchPopoverOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  
  // Get user data and logout functionality from auth context
  const { user, logoutMutation } = useAuth();

  // Handle clicking outside the search results
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchPopoverOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Quick search query
  const { 
    data: searchResults, 
    isLoading: isSearching,
    refetch: refetchSearch
  } = useQuery({
    queryKey: ['/api/search/quick', searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) return { projects: [], requirements: [] };
      const response = await fetch(`/api/search/quick?q=${encodeURIComponent(searchQuery)}&limit=5`);
      if (!response.ok) {
        throw new Error('Search failed');
      }
      return response.json();
    },
    enabled: searchQuery.trim().length > 0,
  });

  // Handle search input
  const handleSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (query.trim()) {
      setIsSearchPopoverOpen(true);
    } else {
      setIsSearchPopoverOpen(false);
    }
  };

  // Navigate to search results
  const navigateToAdvancedSearch = () => {
    navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    setIsSearchPopoverOpen(false);
  };

  // Navigate to specific result
  const navigateToResult = (type: string, id: number) => {
    if (type === 'project') {
      navigate(`/projects/${id}`);
    } else if (type === 'requirement') {
      // First get the project ID
      const requirement = searchResults?.requirements.find((r: any) => r.id === id);
      if (requirement) {
        navigate(`/projects/${requirement.projectId}/requirements/${id}`);
      }
    }
    setIsSearchPopoverOpen(false);
  };

  return (
    <>
      <header className="bg-white dark:bg-gray-800 shadow-sm z-20">
        <div className="max-w-full mx-auto px-4 sm:px-6">
          <div className="flex justify-between items-center py-3 md:justify-start md:space-x-10">
            {/* Logo & Mobile menu button */}
            <div className="flex items-center justify-start lg:w-0 lg:flex-1">
              <button
                onClick={toggleSidebar}
                className="mr-2 inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none md:hidden"
              >
                <Menu className="h-6 w-6" />
              </button>
              <Link href="/" className="flex items-center gap-2">
                <img src={glossaLogo} alt="Glossa Logo" className="w-8 h-8" />
                <span className="text-primary text-2xl font-bold">Glossa</span>
              </Link>
            </div>

            {/* Search bar */}
            <div className="flex-1 max-w-xl mx-4 hidden md:block" ref={searchRef}>
              <Popover open={isSearchPopoverOpen}>
                <PopoverTrigger asChild>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      {isSearching ? (
                        <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
                      ) : (
                        <Search className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                    <Input
                      type="text"
                      placeholder="Search projects and requirements..."
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                      value={searchQuery}
                      onChange={handleSearchInput}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          if (searchQuery.trim()) {
                            navigateToAdvancedSearch();
                          }
                        }
                      }}
                    />
                  </div>
                </PopoverTrigger>
                <PopoverContent className="w-96 p-0" align="start">
                  <div className="py-2">
                    {searchResults?.projects?.length === 0 && searchResults?.requirements?.length === 0 ? (
                      <div className="px-4 py-2 text-sm text-gray-500">
                        No results found
                      </div>
                    ) : (
                      <>
                        {/* Project results */}
                        {searchResults?.projects?.length > 0 && (
                          <div>
                            <div className="px-4 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                              Projects
                            </div>
                            {searchResults.projects.map((project: Project) => (
                              <div 
                                key={`project-${project.id}`}
                                className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
                                onClick={() => navigateToResult('project', project.id)}
                              >
                                <div className="text-sm font-medium">{project.name}</div>
                                {project.description && (
                                  <div className="text-xs text-gray-500 truncate">{project.description}</div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Requirement results */}
                        {searchResults?.requirements?.length > 0 && (
                          <div>
                            <div className="px-4 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                              Requirements
                            </div>
                            {searchResults.requirements.map((req: Requirement) => (
                              <div 
                                key={`req-${req.id}`}
                                className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
                                onClick={() => navigateToResult('requirement', req.id)}
                              >
                                <div className="text-sm font-medium truncate">{req.text.substring(0, 100)}{req.text.length > 100 ? '...' : ''}</div>
                                <div className="flex items-center mt-1">
                                  <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full mr-2">
                                    {req.category}
                                  </span>
                                  <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-full">
                                    {req.priority}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Advanced search link */}
                        <div 
                          className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 text-center text-sm text-primary hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
                          onClick={navigateToAdvancedSearch}
                        >
                          View all results
                        </div>
                      </>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Right navigation */}
            <div className="flex items-center space-x-4">
              {/* New project button */}
              <Button
                onClick={() => setIsProjectModalOpen(true)}
                className="inline-flex items-center shadow-sm"
                size="sm"
              >
                <PlusIcon className="h-4 w-4 mr-1" />
                New Project
              </Button>

              {/* User dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center w-full rounded-full border border-gray-300 dark:border-gray-700 shadow-sm px-2 py-2 bg-white dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                  >
                    <span className="sr-only">Open user menu</span>
                    <Avatar className="h-8 w-8">
                      {user?.avatarUrl ? (
                        <AvatarImage src={user.avatarUrl} alt={`${user.firstName || ''} ${user.lastName || ''}`} />
                      ) : (
                        <AvatarFallback>
                          {user?.firstName?.charAt(0) || ''}{user?.lastName?.charAt(0) || user?.username?.charAt(0) || 'U'}
                        </AvatarFallback>
                      )}
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    {user ? (
                      <div className="flex flex-col">
                        <span>{user.firstName || user.username} {user.lastName || ''}</span>
                        <span className="text-xs text-muted-foreground">{user.email || ''}</span>
                      </div>
                    ) : (
                      "My Account"
                    )}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/settings')}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Profile Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => {
                      logoutMutation.mutate();
                      navigate('/auth');
                    }}
                    disabled={logoutMutation.isPending}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>{logoutMutation.isPending ? "Logging out..." : "Log out"}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Project Creation Modal */}
      <ProjectForm 
        isOpen={isProjectModalOpen} 
        onClose={() => setIsProjectModalOpen(false)} 
      />
    </>
  );
}
