import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { Settings, HelpCircle, LogOut, LogIn } from "lucide-react";

interface SidebarNavFooterProps {
  isCollapsed: boolean;
  handleNavigate: (path: string) => void;
  user: any;
  logoutMutation: any;
  navigate: (path: string) => void;
}

// Create a separate component for the bottom navigation
export function SidebarNavFooter({ 
  isCollapsed, 
  handleNavigate, 
  user, 
  logoutMutation, 
  navigate 
}: SidebarNavFooterProps) {
  return (
    <div className={cn(
      "fixed bottom-0 left-0 pt-3 md:pt-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 z-30 shadow-md",
      isCollapsed ? "w-16" : "w-64 md:w-72 lg:w-64",
      isCollapsed ? "px-1" : "px-2"
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
      {/* Add extra padding at the bottom to ensure content doesn't get hidden */}
      <div className="h-2"></div>
    </div>
  );
}