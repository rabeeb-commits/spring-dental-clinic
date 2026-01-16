import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ThemeProvider as MUIThemeProvider, createTheme, Theme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  mode: ThemeMode;
  toggleMode: () => void;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useThemeMode = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeMode must be used within a ThemeProvider');
  }
  return context;
};

// Light theme palette
const lightPalette = {
  primary: {
    main: '#0891b2',
    light: '#22d3ee',
    dark: '#0e7490',
    contrastText: '#ffffff',
  },
  secondary: {
    main: '#8b5cf6',
    light: '#a78bfa',
    dark: '#7c3aed',
    contrastText: '#ffffff',
  },
  success: {
    main: '#22c55e',
    light: '#4ade80',
    dark: '#16a34a',
    contrastText: '#ffffff',
  },
  error: {
    main: '#ef4444',
    light: '#f87171',
    dark: '#dc2626',
    contrastText: '#ffffff',
  },
  warning: {
    main: '#f59e0b',
    light: '#fbbf24',
    dark: '#d97706',
    contrastText: '#ffffff',
  },
  info: {
    main: '#3b82f6',
    light: '#60a5fa',
    dark: '#2563eb',
    contrastText: '#ffffff',
  },
  background: {
    default: '#f8fafc',
    paper: '#ffffff',
  },
  text: {
    primary: '#0f172a',
    secondary: '#64748b',
  },
};

// Dark theme palette
const darkPalette = {
  primary: {
    main: '#22d3ee',
    light: '#67e8f9',
    dark: '#0891b2',
    contrastText: '#0f172a',
  },
  secondary: {
    main: '#a78bfa',
    light: '#c4b5fd',
    dark: '#8b5cf6',
    contrastText: '#0f172a',
  },
  success: {
    main: '#4ade80',
    light: '#86efac',
    dark: '#22c55e',
    contrastText: '#0f172a',
  },
  error: {
    main: '#f87171',
    light: '#fca5a5',
    dark: '#ef4444',
    contrastText: '#0f172a',
  },
  warning: {
    main: '#fbbf24',
    light: '#fcd34d',
    dark: '#f59e0b',
    contrastText: '#0f172a',
  },
  info: {
    main: '#60a5fa',
    light: '#93c5fd',
    dark: '#3b82f6',
    contrastText: '#0f172a',
  },
  background: {
    default: '#0f172a',
    paper: '#1e293b',
  },
  text: {
    primary: '#f1f5f9',
    secondary: '#94a3b8',
  },
};

const createAppTheme = (mode: ThemeMode): Theme => {
  const palette = mode === 'dark' ? darkPalette : lightPalette;

  return createTheme({
    palette: {
      mode,
      ...palette,
    },
    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      h1: {
        fontWeight: 700,
      },
      h2: {
        fontWeight: 700,
      },
      h3: {
        fontWeight: 600,
      },
      h4: {
        fontWeight: 600,
      },
      h5: {
        fontWeight: 600,
      },
      h6: {
        fontWeight: 600,
      },
    },
    shape: {
      borderRadius: 8,
    },
    shadows: [
      'none',
      '0 1px 2px 0 rgb(0 0 0 / 0.05)',
      '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
      '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
      '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
      '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
      '0 25px 50px -12px rgb(0 0 0 / 0.25)',
      ...Array(18).fill('0 25px 50px -12px rgb(0 0 0 / 0.25)'),
    ] as any,
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 500,
            borderRadius: 8,
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
          },
        },
      },
    },
  });
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('themeMode');
    return (saved as ThemeMode) || 'light';
  });

  useEffect(() => {
    localStorage.setItem('themeMode', mode);
  }, [mode]);

  const toggleMode = () => {
    setModeState(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
  };

  const theme = createAppTheme(mode);

  return (
    <ThemeContext.Provider value={{ mode, toggleMode, setMode }}>
      <MUIThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MUIThemeProvider>
    </ThemeContext.Provider>
  );
};
