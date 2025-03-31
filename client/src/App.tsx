import { useState } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Navbar } from "@/components/layout/navbar";
import { Sidebar } from "@/components/layout/sidebar";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/components/auth/protected-route";

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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };
  
  const toggleSidebarCollapse = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  return (
    <div className="h-screen flex flex-col">
      <Navbar toggleSidebar={toggleSidebar} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar 
          isOpen={isSidebarOpen} 
          isCollapsed={isSidebarCollapsed}
          toggleCollapse={toggleSidebarCollapse}
        />
        <main className="flex-1 flex flex-col overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}

// AuthLayout for pages without sidebar/navbar
function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      {children}
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
