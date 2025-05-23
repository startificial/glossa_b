import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { FileText, ChevronLeft, ChevronRight, Building, Home, FileOutput } from "lucide-react";
import { Project } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { SidebarNavFooter } from "./sidebar-nav";

interface SidebarProps {
  isOpen: boolean;
  isCollapsed: boolean;
  toggleCollapse: () => void;
}

export function Sidebar({ isOpen, isCollapsed, toggleCollapse }: SidebarProps) {
  const [location, navigate] = useLocation();
  const { user, logoutMutation } = useAuth();
  
  // Close sidebar when navigating on mobile
  const handleNavigate = (path: string) => {
    navigate(path);
    // Only auto-close on mobile view
    if (window.innerWidth < 768) {
      // We would need to lift this state up to manage it from parent
      // For now we'll just leave it as is since it will be closed by our resize handler
    }
  };
  
  const { data: projects, isLoading } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
    staleTime: 60000, // 1 minute
  });

  // Create overlay backdrop for mobile when sidebar is open
  const SidebarBackdrop = () => (
    <div 
      className={cn(
        "fixed inset-0 bg-black bg-opacity-50 z-0 transition-opacity md:hidden",
        isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
      )}
      aria-hidden="true"
      onClick={() => navigate(location)} // This will effectively close sidebar by forcing re-render
    />
  );

  return (
    <>
      <SidebarBackdrop />
      <aside
        className={cn(
          "bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 pt-0 pb-20 flex flex-col transform -translate-x-full md:translate-x-0 transition-all duration-300 ease-in-out fixed md:sticky top-0 z-20 h-[calc(100vh-61px)] overflow-hidden",
          isCollapsed ? "w-16" : "w-64 md:w-72 lg:w-64",
          isOpen && "translate-x-0"
        )}
      >
        {/* Main content scrollable area (with ample padding for footer) */}
        <div className="overflow-y-auto pb-40 mask-image-linear">
          <nav className="space-y-2 px-2">
            {/* Main Navigation section with collapse button inline */}
            <div className={cn(
              "flex items-center justify-between border-b border-gray-200 dark:border-gray-700 py-2 mb-1",
              isCollapsed && "justify-center"
            )}>
              {!isCollapsed && (
                <div className="px-2 md:px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Navigation
                </div>
              )}
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "md:flex h-6 w-6 p-0", 
                  isCollapsed ? "flex" : "hidden md:flex ml-auto"
                )}
                onClick={toggleCollapse}
                aria-label={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
              >
                {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              </Button>
            </div>
            
            <div>
              <Link 
                href="/"
                onClick={(e) => {
                  e.preventDefault();
                  handleNavigate("/");
                }}
                className={cn(
                  "group flex items-center px-2 md:px-3 py-2 text-sm font-medium rounded-md",
                  location === "/"
                    ? "bg-primary text-white"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                )}
                title={isCollapsed ? "Dashboard" : undefined}
              >
                <Home
                  className={cn(
                    "flex-shrink-0 h-5 w-5",
                    isCollapsed ? "mr-0" : "mr-2 md:mr-3",
                    location === "/" ? "" : "text-gray-500 dark:text-gray-400"
                  )}
                />
                <span className={cn(
                  "truncate",
                  isCollapsed && "hidden"
                )}>
                  Dashboard
                </span>
              </Link>
            </div>
            
            <div>
              <Link 
                href="/projects"
                onClick={(e) => {
                  e.preventDefault();
                  handleNavigate("/projects");
                }}
                className={cn(
                  "group flex items-center px-2 md:px-3 py-2 text-sm font-medium rounded-md",
                  location === "/projects"
                    ? "bg-primary text-white"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                )}
                title={isCollapsed ? "Projects" : undefined}
              >
                <FileText
                  className={cn(
                    "flex-shrink-0 h-5 w-5",
                    isCollapsed ? "mr-0" : "mr-2 md:mr-3",
                    location === "/projects" ? "" : "text-gray-500 dark:text-gray-400"
                  )}
                />
                <span className={cn(
                  "truncate",
                  isCollapsed && "hidden"
                )}>
                  Projects
                </span>
              </Link>
            </div>
            
            <div>
              <Link 
                href="/customers"
                onClick={(e) => {
                  e.preventDefault();
                  handleNavigate("/customers");
                }}
                className={cn(
                  "group flex items-center px-2 md:px-3 py-2 text-sm font-medium rounded-md",
                  location === "/customers"
                    ? "bg-primary text-white"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                )}
                title={isCollapsed ? "Customers" : undefined}
              >
                <Building
                  className={cn(
                    "flex-shrink-0 h-5 w-5",
                    isCollapsed ? "mr-0" : "mr-2 md:mr-3",
                    location === "/customers" ? "" : "text-gray-500 dark:text-gray-400"
                  )}
                />
                <span className={cn(
                  "truncate",
                  isCollapsed && "hidden"
                )}>
                  Customers
                </span>
              </Link>
            </div>
            
            {/* Recent Projects Section */}
            <div className="mt-6">
              <div className={cn(
                "px-2 md:px-3 py-1 md:py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider",
                isCollapsed && "hidden"
              )}>
                Recent Projects
              </div>

              {isLoading ? (
                // Loading skeletons - responsive
                <>
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="px-2 md:px-3 py-2 md:py-3">
                      <Skeleton className="h-5 md:h-6 w-full" />
                    </div>
                  ))}
                </>
              ) : (
                // Project list - responsive
                <>
                  {(projects || []).length === 0 ? (
                    <div className={cn(
                      "px-2 md:px-3 py-2 text-sm text-gray-500 italic",
                      isCollapsed && "hidden"
                    )}>
                      No projects yet
                    </div>
                  ) : (
                    (projects || []).map((project: Project) => {
                      const isActive = location === `/projects/${project.id}`;
                      return (
                        <div key={project.id}>
                          <Link 
                            href={`/projects/${project.id}`}
                            onClick={(e) => {
                              e.preventDefault();
                              handleNavigate(`/projects/${project.id}`);
                            }}
                            className={cn(
                              "group flex items-center px-2 md:px-3 py-2 text-sm font-medium rounded-md",
                              isActive
                                ? "bg-primary text-white"
                                : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                            )}
                            title={isCollapsed ? project.name : undefined}
                          >
                            <FileText
                              className={cn(
                                "flex-shrink-0 h-5 w-5",
                                isCollapsed ? "mr-0" : "mr-2 md:mr-3",
                                isActive ? "" : "text-gray-500 dark:text-gray-400"
                              )}
                            />
                            <span className={cn(
                              "truncate",
                              isCollapsed && "hidden"
                            )}>
                              {project.name}
                            </span>
                          </Link>
                        </div>
                      );
                    })
                  )}
                </>
              )}
            </div>
          </nav>
        </div>
      </aside>
      
      {/* Footer component - separate from the scrollable area */}
      <SidebarNavFooter 
        isCollapsed={isCollapsed}
        handleNavigate={handleNavigate}
        user={user}
        logoutMutation={logoutMutation}
        navigate={navigate}
      />
    </>
  );
}
