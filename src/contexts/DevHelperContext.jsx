import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';

const DevHelperContext = createContext();

export const DevHelperProvider = ({ children }) => {
  const [isDevHelperVisible, setIsDevHelperVisible] = useState(() => {
    try {
      const item = window.localStorage.getItem('devHelperVisible');
      return item ? JSON.parse(item) : false;
    } catch (error) {
      console.error('Error reading from localStorage', error);
      return false;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem('devHelperVisible', JSON.stringify(isDevHelperVisible));
    } catch (error) {
      console.error('Error writing to localStorage', error);
    }
  }, [isDevHelperVisible]);

  const value = useMemo(() => ({ isDevHelperVisible, setIsDevHelperVisible }), [isDevHelperVisible]);

  return (
    <DevHelperContext.Provider value={value}>
      {children}
    </DevHelperContext.Provider>
  );
};

export const useDevHelper = () => {
  const context = useContext(DevHelperContext);
  if (context === undefined) {
    throw new Error('useDevHelper must be used within a DevHelperProvider');
  }
  return context;
};