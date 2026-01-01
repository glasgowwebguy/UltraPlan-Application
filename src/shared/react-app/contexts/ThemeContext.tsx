import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Theme = 'dark' | 'light' | 'coloursplash';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  cycleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem('theme_preference') as Theme;
    // Migrate old 'light' theme to 'coloursplash'
    if (stored === 'light') {
      document.documentElement.classList.add('coloursplash');
      return 'coloursplash';
    }
    if (stored === 'dark' || stored === 'coloursplash') {
      // Apply the initial theme class immediately to avoid flash
      if (stored === 'dark') {
        document.documentElement.classList.add('dark');
      } else if (stored === 'coloursplash') {
        document.documentElement.classList.add('coloursplash');
      }
      return stored;
    }
    // Default to dark
    document.documentElement.classList.add('dark');
    return 'dark';
  });

  useEffect(() => {
    localStorage.setItem('theme_preference', theme);

    // Remove all theme classes
    document.documentElement.classList.remove('dark', 'light', 'coloursplash');

    // Apply appropriate class
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (theme === 'coloursplash') {
      document.documentElement.classList.add('coloursplash');
    }
    // 'light' theme doesn't need a class - it's the default

    console.log('Theme applied:', theme, '| HTML classes:', document.documentElement.className);
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  const cycleTheme = () => {
    setThemeState(prevTheme => {
      if (prevTheme === 'dark') return 'coloursplash';
      return 'dark';
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, cycleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
