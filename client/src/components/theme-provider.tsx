/**
 * Theme Provider
 * 
 * A component that provides theming functionality to the application,
 * including light/dark mode toggle and persistence.
 */
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { logger } from '@/lib/logger';

/**
 * Theme options
 */
type Theme = 'light' | 'dark' | 'system';

/**
 * Theme context shape
 */
interface ThemeContextType {
  /** Current theme */
  theme: Theme;
  /** Whether the active theme is dark */
  isDarkMode: boolean;
  /** Set the theme */
  setTheme: (theme: Theme) => void;
}

/**
 * Theme provider props
 */
interface ThemeProviderProps {
  /** Initial theme (defaults to system) */
  defaultTheme?: Theme;
  /** Whether to store theme preference in localStorage */
  storageKey?: string;
  /** Children components */
  children: ReactNode;
}

/**
 * Create the theme context
 */
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/**
 * Hook to use the theme context
 */
export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  
  return context;
}

/**
 * Theme provider component
 */
export function ThemeProvider({
  defaultTheme = 'system',
  storageKey = 'ui-theme',
  children,
}: ThemeProviderProps) {
  // Initialize theme state from storage or default
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      // Try to get the theme from localStorage
      const storedTheme = localStorage.getItem(storageKey);
      return (storedTheme as Theme) || defaultTheme;
    } catch (error) {
      // If localStorage fails, use the default theme
      logger.error('Failed to read theme from localStorage', { error });
      return defaultTheme;
    }
  });
  
  // Determine if dark mode is active
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  
  // Set the theme in localStorage and update the document class
  const setTheme = (newTheme: Theme) => {
    try {
      // Store the theme preference
      localStorage.setItem(storageKey, newTheme);
      
      // Update the state
      setThemeState(newTheme);
      
      // Log theme change
      logger.debug('Theme changed', { theme: newTheme });
    } catch (error) {
      logger.error('Failed to store theme in localStorage', { error });
    }
  };
  
  // Effect to update the document class and determine dark mode
  useEffect(() => {
    const root = window.document.documentElement;
    
    // Remove existing theme classes
    root.classList.remove('light', 'dark');
    
    // Determine if we should use dark mode
    let isDark = false;
    
    if (theme === 'system') {
      // Use the system preference
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      isDark = systemPrefersDark;
      
      // Add the appropriate class
      root.classList.add(isDark ? 'dark' : 'light');
    } else {
      // Use the user preference
      isDark = theme === 'dark';
      
      // Add the appropriate class
      root.classList.add(theme);
    }
    
    // Update the dark mode state
    setIsDarkMode(isDark);
  }, [theme]);
  
  // Effect to handle system preference changes
  useEffect(() => {
    if (theme !== 'system') {
      return;
    }
    
    // Create a media query to detect preference changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    // Handler for preference changes
    const handleChange = (event: MediaQueryListEvent) => {
      const root = window.document.documentElement;
      
      // Update the class based on the new preference
      root.classList.remove('light', 'dark');
      root.classList.add(event.matches ? 'dark' : 'light');
      
      // Update the dark mode state
      setIsDarkMode(event.matches);
      
      // Log the change
      logger.debug('System theme preference changed', { darkMode: event.matches });
    };
    
    // Listen for preference changes
    mediaQuery.addEventListener('change', handleChange);
    
    // Clean up the listener
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);
  
  // Value for the context provider
  const value = {
    theme,
    isDarkMode,
    setTheme,
  };
  
  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}