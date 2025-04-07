import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Settings, HelpCircle, FileText, ChevronLeft, ChevronRight, LogOut, LogIn, Building, Home, FileOutput } from "lucide-react";
import { Project } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

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
          "bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 pt-3 pb-4 flex flex-col transform -translate-x-full md:translate-x-0 transition-all duration-300 ease-in-out fixed md:sticky top-0 z-20 h-[calc(100vh-61px)] overflow-y-auto",
          isCollapsed ? "w-16" : "w-64 md:w-72 lg:w-64",
          isOpen && "translate-x-0"
        )}
      >
        <div className="flex flex-shrink-0 px-2 md:px-4 mb-3 md:mb-5 items-center justify-between">
          <div className={cn("flex-1", isCollapsed && "hidden")}>
            <h2 className="text-base md:text-lg font-medium">Projects</h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto hidden md:flex"
            onClick={toggleCollapse}
            aria-label={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        {/* Main Navigation */}
        <div className="mt-2 md:mt-5 flex-1">
          <nav className="flex-1 space-y-4 px-2">
            {/* Main Navigation Links */}
            <div className={cn(
              "px-2 md:px-3 py-1 md:py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider",
              isCollapsed && "hidden"
            )}>
              Navigation
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
            
            <div>
              <Link 
                href="/templates"
                onClick={(e) => {
                  e.preventDefault();
                  handleNavigate("/templates");
                }}
                className={cn(
                  "group flex items-center px-2 md:px-3 py-2 text-sm font-medium rounded-md",
                  location === "/templates" || location.startsWith("/templates/")
                    ? "bg-primary text-white"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                )}
                title={isCollapsed ? "Document Templates" : undefined}
              >
                <FileOutput
                  className={cn(
                    "flex-shrink-0 h-5 w-5",
                    isCollapsed ? "mr-0" : "mr-2 md:mr-3",
                    location === "/templates" || location.startsWith("/templates/") ? "" : "text-gray-500 dark:text-gray-400"
                  )}
                />
                <span className={cn(
                  "truncate",
                  isCollapsed && "hidden"
                )}>
                  Document Templates
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

        {/* User and Settings */}
        <div className={cn(
          "mt-4 md:mt-6 pt-3 md:pt-4 border-t border-gray-200 dark:border-gray-700",
          isCollapsed ? "mx-1" : "mx-2"
        )}>
          <Link 
            href="/settings"
            onClick={(e) => {
              e.preventDefault();
              handleNavigate("/settings");
            }}
            className={cn(
              "flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700",
              isCollapsed && "justify-center"
            )}
            title={isCollapsed ? "Settings" : undefined}
          >
            <Settings className={cn(
              "h-5 w-5 text-gray-500 dark:text-gray-400",
              isCollapsed ? "mr-0" : "mr-2 md:mr-3"
            )} />
            <span className={cn(isCollapsed && "hidden")}>
              Settings
            </span>
          </Link>
          <Link 
            href="/help"
            onClick={(e) => {
              e.preventDefault();
              handleNavigate("/help");
            }}
            className={cn(
              "flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700",
              isCollapsed && "justify-center"
            )}
            title={isCollapsed ? "Help & Support" : undefined}
          >
            <HelpCircle className={cn(
              "h-5 w-5 text-gray-500 dark:text-gray-400",
              isCollapsed ? "mr-0" : "mr-2 md:mr-3"
            )} />
            <span className={cn(isCollapsed && "hidden")}>
              Help & Support
            </span>
          </Link>
          
          {user ? (
            <button
              onClick={() => {
                logoutMutation.mutate();
                navigate('/auth');
              }}
              disabled={logoutMutation.isPending}
              className={cn(
                "flex items-center w-full px-2 py-2 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700",
                isCollapsed && "justify-center"
              )}
              title={isCollapsed ? "Log out" : undefined}
            >
              <LogOut className={cn(
                "h-5 w-5 text-gray-500 dark:text-gray-400",
                isCollapsed ? "mr-0" : "mr-2 md:mr-3"
              )} />
              <span className={cn(isCollapsed && "hidden")}>
                {logoutMutation.isPending ? "Logging out..." : "Log out"}
              </span>
            </button>
          ) : (
            <Link
              href="/auth"
              onClick={(e) => {
                e.preventDefault();
                handleNavigate("/auth");
              }}
              className={cn(
                "flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700",
                isCollapsed && "justify-center"
              )}
              title={isCollapsed ? "Log in / Register" : undefined}
            >
              <LogIn className={cn(
                "h-5 w-5 text-gray-500 dark:text-gray-400",
                isCollapsed ? "mr-0" : "mr-2 md:mr-3"
              )} />
              <span className={cn(isCollapsed && "hidden")}>
                Log in / Register
              </span>
            </Link>
          )}
        </div>
      </aside>
    </>
  );
}
