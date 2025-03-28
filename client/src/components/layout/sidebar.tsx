import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Settings, HelpCircle, FileText } from "lucide-react";
import { Project } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";

interface SidebarProps {
  isOpen: boolean;
}

export function Sidebar({ isOpen }: SidebarProps) {
  const [location] = useLocation();
  
  const { data: projects, isLoading } = useQuery({
    queryKey: ['/api/projects'],
    staleTime: 60000, // 1 minute
  });

  return (
    <aside
      className={cn(
        "bg-white dark:bg-gray-800 w-64 border-r border-gray-200 dark:border-gray-700 pt-5 pb-4 flex flex-col transform -translate-x-full md:translate-x-0 transition-transform duration-300 ease-in-out fixed md:relative z-10 h-[calc(100vh-61px)] overflow-y-auto",
        isOpen && "translate-x-0"
      )}
    >
      <div className="flex flex-shrink-0 px-4 mb-5">
        <div className="flex-1">
          <h2 className="text-lg font-medium">Projects</h2>
        </div>
      </div>

      {/* Project Navigation */}
      <div className="mt-5 flex-1">
        <nav className="flex-1 space-y-1 px-2">
          <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
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
              {projects?.map((project: Project) => {
                const isActive = location === `/projects/${project.id}`;
                return (
                  <Link 
                    key={project.id} 
                    href={`/projects/${project.id}`}
                  >
                    <a
                      className={cn(
                        "group flex items-center px-3 py-2 text-sm font-medium rounded-md",
                        isActive
                          ? "bg-primary text-white"
                          : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      )}
                    >
                      <FileText
                        className={cn(
                          "mr-3 h-5 w-5",
                          isActive ? "" : "text-gray-500 dark:text-gray-400"
                        )}
                      />
                      {project.name}
                    </a>
                  </Link>
                );
              })}
            </>
          )}
        </nav>
      </div>

      {/* User and Settings */}
      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 mx-2">
        <Link href="/settings">
          <a className="flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
            <Settings className="mr-3 h-5 w-5 text-gray-500 dark:text-gray-400" />
            Settings
          </a>
        </Link>
        <Link href="/help">
          <a className="flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
            <HelpCircle className="mr-3 h-5 w-5 text-gray-500 dark:text-gray-400" />
            Help & Support
          </a>
        </Link>
      </div>
    </aside>
  );
}
