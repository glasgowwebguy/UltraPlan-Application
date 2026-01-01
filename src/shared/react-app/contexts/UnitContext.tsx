import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface UnitContextType {
  useMiles: boolean; // true = miles, false = kilometers
  toggleUnit: () => void;
}

const UnitContext = createContext<UnitContextType | undefined>(undefined);

interface UnitProviderProps {
  children: ReactNode;
}

export const UnitProvider: React.FC<UnitProviderProps> = ({ children }) => {
  // Initialize from localStorage, default to miles (true)
  const [useMiles, setUseMiles] = useState<boolean>(() => {
    const stored = localStorage.getItem('unit_preference');
    if (stored === null) {
      return true; // Default to miles
    }
    return stored === 'miles';
  });

  // Persist to localStorage whenever the preference changes
  useEffect(() => {
    localStorage.setItem('unit_preference', useMiles ? 'miles' : 'kilometers');
  }, [useMiles]);

  const toggleUnit = () => {
    setUseMiles(prev => !prev);
  };

  return (
    <UnitContext.Provider value={{ useMiles, toggleUnit }}>
      {children}
    </UnitContext.Provider>
  );
};

export const useUnit = (): UnitContextType => {
  const context = useContext(UnitContext);
  if (context === undefined) {
    throw new Error('useUnit must be used within a UnitProvider');
  }
  return context;
};
