import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Settings, HelpCircle, FileText, ChevronLeft, ChevronRight, LogOut, LogIn } from "lucide-react";
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
  
  const { data: projects, isLoading } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
    staleTime: 60000, // 1 minute
  });

  return (
    <aside
      className={cn(
        "bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 pt-5 pb-4 flex flex-col transform -translate-x-full md:translate-x-0 transition-all duration-300 ease-in-out fixed md:relative z-10 h-[calc(100vh-61px)] overflow-y-auto",
        isCollapsed ? "w-16" : "w-64",
        isOpen && "translate-x-0"
      )}
    >
      <div className="flex flex-shrink-0 px-4 mb-5 items-center justify-between">
        <div className={cn("flex-1", isCollapsed && "hidden")}>
          <h2 className="text-lg font-medium">Projects</h2>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto"
          onClick={toggleCollapse}
          aria-label={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Project Navigation */}
      <div className="mt-5 flex-1">
        <nav className="flex-1 space-y-1 px-2">
          <div className={cn(
            "px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider",
            isCollapsed && "hidden"
          )}>
            Recent Projects
          </div>

          {isLoading ? (
            // Loading skeletons
            <>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="px-3 py-3">
                  <Skeleton className="h-6 w-full" />
                </div>
              ))}
            </>
          ) : (
            // Project list
            <>
              {(projects || []).map((project: Project) => {
                const isActive = location === `/projects/${project.id}`;
                return (
                  <div key={project.id}>
                    <Link 
                      href={`/projects/${project.id}`}
                      className={cn(
                        "group flex items-center px-3 py-2 text-sm font-medium rounded-md",
                        isActive
                          ? "bg-primary text-white"
                          : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      )}
                      title={isCollapsed ? project.name : undefined}
                    >
                      <FileText
                        className={cn(
                          "h-5 w-5",
                          isCollapsed ? "mr-0" : "mr-3",
                          isActive ? "" : "text-gray-500 dark:text-gray-400"
                        )}
                      />
                      <span className={cn(isCollapsed && "hidden")}>
                        {project.name}
                      </span>
                    </Link>
                  </div>
                );
              })}
            </>
          )}
        </nav>
      </div>

      {/* User and Settings */}
      <div className={cn(
        "mt-6 pt-4 border-t border-gray-200 dark:border-gray-700",
        isCollapsed ? "mx-1" : "mx-2"
      )}>
        <Link 
          href="/settings"
          className={cn(
            "flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700",
            isCollapsed && "justify-center"
          )}
          title={isCollapsed ? "Settings" : undefined}
        >
          <Settings className={cn(
            "h-5 w-5 text-gray-500 dark:text-gray-400",
            isCollapsed ? "mr-0" : "mr-3"
          )} />
          <span className={cn(isCollapsed && "hidden")}>
            Settings
          </span>
        </Link>
        <Link 
          href="/help"
          className={cn(
            "flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700",
            isCollapsed && "justify-center"
          )}
          title={isCollapsed ? "Help & Support" : undefined}
        >
          <HelpCircle className={cn(
            "h-5 w-5 text-gray-500 dark:text-gray-400",
            isCollapsed ? "mr-0" : "mr-3"
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
              isCollapsed ? "mr-0" : "mr-3"
            )} />
            <span className={cn(isCollapsed && "hidden")}>
              {logoutMutation.isPending ? "Logging out..." : "Log out"}
            </span>
          </button>
        ) : (
          <Link
            href="/auth"
            className={cn(
              "flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700",
              isCollapsed && "justify-center"
            )}
            title={isCollapsed ? "Log in / Register" : undefined}
          >
            <LogIn className={cn(
              "h-5 w-5 text-gray-500 dark:text-gray-400",
              isCollapsed ? "mr-0" : "mr-3"
            )} />
            <span className={cn(isCollapsed && "hidden")}>
              Log in / Register
            </span>
          </Link>
        )}
      </div>
    </aside>
  );
}
