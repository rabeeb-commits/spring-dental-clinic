import React, { createContext, useContext, useState, useEffect } from 'react';

interface ClinicSettings {
  name: string;
  logo: string; // Can be emoji or URL
  phone?: string;
  address?: string;
  openTime?: string;
  closeTime?: string;
  upiId?: string;
}

interface ClinicContextType {
  settings: ClinicSettings;
  updateSettings: (settings: Partial<ClinicSettings>) => void;
}

const defaultSettings: ClinicSettings = {
  name: 'DentalCare',
  logo: '🦷',
  phone: '',
  address: '',
  openTime: '09:00',
  closeTime: '18:00',
  upiId: '',
};

const ClinicContext = createContext<ClinicContextType | undefined>(undefined);

export const ClinicProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<ClinicSettings>(() => {
    const stored = localStorage.getItem('clinicSettings');
    return stored ? { ...defaultSettings, ...JSON.parse(stored) } : defaultSettings;
  });

  useEffect(() => {
    localStorage.setItem('clinicSettings', JSON.stringify(settings));
  }, [settings]);

  const updateSettings = (newSettings: Partial<ClinicSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  return (
    <ClinicContext.Provider value={{ settings, updateSettings }}>
      {children}
    </ClinicContext.Provider>
  );
};

export const useClinic = (): ClinicContextType => {
  const context = useContext(ClinicContext);
  if (context === undefined) {
    throw new Error('useClinic must be used within a ClinicProvider');
  }
  return context;
};


