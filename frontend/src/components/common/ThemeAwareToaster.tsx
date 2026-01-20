import React from 'react';
import { Toaster } from 'react-hot-toast';
import { useThemeMode } from '../../context/ThemeContext';

const ThemeAwareToaster: React.FC = () => {
  const { mode } = useThemeMode();

  const isDark = mode === 'dark';

  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: isDark ? '#1e293b' : '#ffffff',
          color: isDark ? '#f1f5f9' : '#1e293b',
          borderRadius: '12px',
          padding: '16px',
          boxShadow: isDark
            ? '0 10px 15px -3px rgb(0 0 0 / 0.3), 0 4px 6px -4px rgb(0 0 0 / 0.2)'
            : '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
          border: isDark ? '1px solid rgba(148, 163, 184, 0.2)' : '1px solid #e2e8f0',
          fontSize: '0.9375rem',
          fontWeight: 500,
        },
        success: {
          iconTheme: {
            primary: '#10b981',
            secondary: isDark ? '#1e293b' : '#ffffff',
          },
          style: {
            background: isDark ? '#064e3b' : '#dcfce7',
            color: isDark ? '#6ee7b7' : '#16a34a',
            borderColor: isDark ? '#059669' : '#86efac',
          },
        },
        error: {
          iconTheme: {
            primary: '#ef4444',
            secondary: isDark ? '#1e293b' : '#ffffff',
          },
          style: {
            background: isDark ? '#7f1d1d' : '#fee2e2',
            color: isDark ? '#fca5a5' : '#dc2626',
            borderColor: isDark ? '#dc2626' : '#fca5a5',
          },
        },
        loading: {
          style: {
            background: isDark ? '#1e3a8a' : '#dbeafe',
            color: isDark ? '#93c5fd' : '#2563eb',
            borderColor: isDark ? '#3b82f6' : '#93c5fd',
          },
        },
      }}
    />
  );
};

export default ThemeAwareToaster;
