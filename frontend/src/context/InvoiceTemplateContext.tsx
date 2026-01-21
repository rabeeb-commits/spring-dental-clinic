import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { invoiceTemplatesApi } from '../services/api';
import { InvoiceTemplate } from '../types';
import { useAuth } from './AuthContext';

interface InvoiceTemplateContextType {
  template: InvoiceTemplate | null;
  loading: boolean;
  error: string | null;
  refreshTemplate: () => Promise<void>;
  updateTemplate: (template: InvoiceTemplate) => void;
}

const InvoiceTemplateContext = createContext<InvoiceTemplateContextType | undefined>(undefined);

const defaultTemplate: InvoiceTemplate = {
  id: '',
  name: 'Default',
  isDefault: true,
  logoPosition: 'left',
  showClinicName: true,
  showAddress: true,
  showContact: true,
  templateStyle: 'classic',
  itemTableStyle: 'bordered',
  totalsPosition: 'right',
  showDueDate: true,
  showPaymentMethods: true,
  lateFeeEnabled: false,
  taxLabel: 'Tax',
  taxType: 'percentage',
  showTaxBreakdown: false,
  showSignature: false,
  primaryColor: '#0891b2',
  fontFamily: 'Arial, sans-serif',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export const InvoiceTemplateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [template, setTemplate] = useState<InvoiceTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const fetchTemplate = useCallback(async () => {
    // Don't fetch if not authenticated
    if (!isAuthenticated) {
      // Use cached template or default
      const cached = localStorage.getItem('invoiceTemplate');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          setTemplate(parsed);
        } catch (e) {
          // Invalid cache, use default
          setTemplate(defaultTemplate);
        }
      } else {
        setTemplate(defaultTemplate);
      }
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Try to get from localStorage first for quick access
      const cached = localStorage.getItem('invoiceTemplate');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          setTemplate(parsed);
        } catch (e) {
          // Invalid cache, ignore
        }
      }

      // Fetch from API
      const response = await invoiceTemplatesApi.getDefault();
      if (response.data.success) {
        const fetchedTemplate = response.data.data;
        setTemplate(fetchedTemplate);
        // Cache in localStorage
        localStorage.setItem('invoiceTemplate', JSON.stringify(fetchedTemplate));
      } else {
        // Use default template if API fails
        setTemplate(defaultTemplate);
      }
    } catch (err: any) {
      // Silently handle 401 errors (expected when not authenticated)
      // Only log other errors
      if (err.response?.status !== 401) {
        console.error('Failed to fetch invoice template:', err);
        setError(err.message || 'Failed to load invoice template');
      }
      
      // Try to use cached template
      const cached = localStorage.getItem('invoiceTemplate');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          setTemplate(parsed);
        } catch (e) {
          // Use default template as fallback
          setTemplate(defaultTemplate);
        }
      } else {
        setTemplate(defaultTemplate);
      }
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    // Wait for auth to finish loading before fetching
    if (!authLoading) {
      fetchTemplate();
    }
  }, [fetchTemplate, authLoading]);

  const refreshTemplate = useCallback(async () => {
    await fetchTemplate();
  }, [fetchTemplate]);

  const updateTemplate = useCallback((newTemplate: InvoiceTemplate) => {
    setTemplate(newTemplate);
    // Update cache
    localStorage.setItem('invoiceTemplate', JSON.stringify(newTemplate));
  }, []);

  const value: InvoiceTemplateContextType = {
    template: template || defaultTemplate,
    loading,
    error,
    refreshTemplate,
    updateTemplate,
  };

  return <InvoiceTemplateContext.Provider value={value}>{children}</InvoiceTemplateContext.Provider>;
};

export const useInvoiceTemplate = (): InvoiceTemplateContextType => {
  const context = useContext(InvoiceTemplateContext);
  if (context === undefined) {
    throw new Error('useInvoiceTemplate must be used within an InvoiceTemplateProvider');
  }
  return context;
};
