import { useState } from "react";
import { Link } from "wouter";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Button } from "@/components/ui/button";
import { PlusIcon, Menu, Search } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { ProjectForm } from "@/components/projects/project-form";

interface NavbarProps {
  toggleSidebar: () => void;
}

export function Navbar({ toggleSidebar }: NavbarProps) {
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);

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
              <Link href="/" className="flex items-center">
                <span className="text-primary text-2xl font-bold">Glossa</span>
              </Link>
            </div>

            {/* Search bar */}
            <div className="flex-1 max-w-xl mx-4 hidden md:block">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <Input
                  type="text"
                  placeholder="Search projects and requirements..."
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                />
              </div>
            </div>

            {/* Right navigation */}
            <div className="flex items-center space-x-4">
              {/* Dark mode toggle */}
              <ThemeToggle />

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
              <div className="relative inline-block text-left">
                <button
                  type="button"
                  className="inline-flex items-center justify-center w-full rounded-full border border-gray-300 dark:border-gray-700 shadow-sm px-2 py-2 bg-white dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                >
                  <span className="sr-only">Open user menu</span>
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" alt="User avatar" />
                    <AvatarFallback>U</AvatarFallback>
                  </Avatar>
                </button>
              </div>
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
