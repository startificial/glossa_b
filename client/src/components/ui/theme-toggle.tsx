import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export function ThemeToggle() {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Check for saved dark mode preference on initial load
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setIsDarkMode(savedDarkMode);
    
    if (savedDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('darkMode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('darkMode', 'false');
    }
  };

  return (
    <div className="flex items-center">
      <span className="mr-2 text-sm hidden md:inline">Theme</span>
      <div className="flex items-center space-x-2">
        <Switch 
          id="dark-mode-toggle" 
          checked={isDarkMode} 
          onCheckedChange={toggleTheme}
        />
        <Label htmlFor="dark-mode-toggle" className="sr-only">
          Toggle dark mode
        </Label>
        <span className="sr-only">
          {isDarkMode ? "Dark mode" : "Light mode"}
        </span>
        {isDarkMode ? (
          <Moon className="h-4 w-4 text-slate-400" />
        ) : (
          <Sun className="h-4 w-4 text-slate-500" />
        )}
      </div>
    </div>
  );
}
