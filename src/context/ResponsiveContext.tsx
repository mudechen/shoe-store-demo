import React, { createContext, useContext, useState, useEffect } from 'react';

interface ResponsiveContextType {
  isMobile: boolean;
  isSimulator: boolean;
  simulatedDevice: '375' | '390' | '430' | 'fluid';
  containerQueryClass: string;
}

const ResponsiveContext = createContext<ResponsiveContextType>({
  isMobile: false,
  isSimulator: false,
  simulatedDevice: '390',
  containerQueryClass: '',
});

interface ResponsiveProviderProps {
  children: React.ReactNode;
  isSimulator: boolean;
  simulatedDevice: '375' | '390' | '430' | 'fluid';
}

export const ResponsiveProvider: React.FC<ResponsiveProviderProps> = ({
  children,
  isSimulator,
  simulatedDevice,
}) => {
  const [isWindowMobile, setIsWindowMobile] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768;
    }
    return false;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsWindowMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Effective mobile mode is TRUE if either the simulator is active OR the actual device/window is mobile (< 768px)
  const isMobile = isSimulator || isWindowMobile;

  return (
    <ResponsiveContext.Provider
      value={{
        isMobile,
        isSimulator,
        simulatedDevice,
        containerQueryClass: isMobile ? 'layout-mobile' : 'layout-desktop',
      }}
    >
      {children}
    </ResponsiveContext.Provider>
  );
};

export const useResponsive = () => useContext(ResponsiveContext);
