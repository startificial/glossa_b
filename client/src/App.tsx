import { useState, useEffect } from "react";
import { Switch, Route, Link } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Navbar } from "@/components/layout/navbar";
import { Sidebar } from "@/components/layout/sidebar";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/components/auth/protected-route";
import glossaLogo from "./assets/glossa-logo.png";

import Dashboard from "@/pages/dashboard";
import Projects from "@/pages/projects";
import ProjectDetail from "@/pages/project-detail";
import RequirementDetail from "@/pages/requirement-detail";
import TaskDetail from "@/pages/task-detail";
import Settings from "@/pages/settings";
import AuthPage from "@/pages/auth-page";
import NotFound from "@/pages/not-found";
import { SearchResults } from "@/pages/search-results";

function Layout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  // On larger screens, don't collapse sidebar by default
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(window.innerWidth < 1024);
  
  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        // Auto-close sidebar when resizing to desktop
        setIsSidebarOpen(false);
      }
      
      // Auto-collapse sidebar on smaller screens
      if (window.innerWidth < 1024 && !isSidebarCollapsed) {
        setIsSidebarCollapsed(true);
      } else if (window.innerWidth >= 1280 && isSidebarCollapsed) {
        // Auto-expand sidebar on very large screens
        setIsSidebarCollapsed(false);
      }
    };

    // Add window resize listener
    window.addEventListener('resize', handleResize);
    
    // Cleanup function
    return () => window.removeEventListener('resize', handleResize);
  }, [isSidebarCollapsed]);
  
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };
  
  const toggleSidebarCollapse = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header>
        <Navbar toggleSidebar={toggleSidebar} />
      </header>
      <div className="flex flex-1 relative overflow-hidden">
        <Sidebar 
          isOpen={isSidebarOpen} 
          isCollapsed={isSidebarCollapsed}
          toggleCollapse={toggleSidebarCollapse}
        />
        <main className="flex-1 flex flex-col overflow-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}

// AuthLayout for pages without sidebar/navbar
function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="py-4 px-4 sm:px-6 flex items-center justify-center border-b border-gray-200 dark:border-gray-700">
        <Link href="/" className="flex items-center gap-2">
          <img src={glossaLogo} alt="Glossa Logo" className="w-8 h-8" />
          <span className="text-primary text-xl md:text-2xl font-bold logo-text">Glossa</span>
        </Link>
      </header>
      <main className="flex-1 flex flex-col">
        {children}
      </main>
    </div>
  );
}

function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <Layout>
      {children}
    </Layout>
  );
}

function Router() {
  return (
    <Switch>
      {/* Auth route - public */}
      <Route path="/auth">
        <AuthLayout>
          <AuthPage />
        </AuthLayout>
      </Route>
      
      {/* Protected routes */}
      <ProtectedRoute path="/" component={() => (
        <ProtectedLayout>
          <Dashboard />
        </ProtectedLayout>
      )} />
      
      <ProtectedRoute path="/projects" component={() => (
        <ProtectedLayout>
          <Projects />
        </ProtectedLayout>
      )} />
      
      <ProtectedRoute path="/projects/:id" component={() => {
        // Wrap this in a function that gets the params
        return (
          <Route path="/projects/:id">
            {params => (
              <ProtectedLayout>
                <ProjectDetail projectId={parseInt(params.id)} />
              </ProtectedLayout>
            )}
          </Route>
        );
      }} />
      
      <ProtectedRoute path="/projects/:projectId/requirements/:requirementId" component={() => {
        return (
          <Route path="/projects/:projectId/requirements/:requirementId">
            {params => (
              <ProtectedLayout>
                <RequirementDetail 
                  projectId={parseInt(params.projectId)} 
                  requirementId={parseInt(params.requirementId)} 
                />
              </ProtectedLayout>
            )}
          </Route>
        );
      }} />
      
      <ProtectedRoute path="/tasks/:taskId" component={() => {
        return (
          <Route path="/tasks/:taskId">
            {params => (
              <ProtectedLayout>
                <TaskDetail 
                  taskId={parseInt(params.taskId)} 
                />
              </ProtectedLayout>
            )}
          </Route>
        );
      }} />
      
      <ProtectedRoute path="/settings" component={() => (
        <ProtectedLayout>
          <Settings />
        </ProtectedLayout>
      )} />
      
      <ProtectedRoute path="/search" component={() => (
        <ProtectedLayout>
          <SearchResults />
        </ProtectedLayout>
      )} />
      
      {/* 404 - Not Found */}
      <Route>
        <ProtectedLayout>
          <NotFound />
        </ProtectedLayout>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
