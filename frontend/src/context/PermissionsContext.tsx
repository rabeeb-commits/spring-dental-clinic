import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { usersApi } from '../services/api';

export type PermissionModule =
  | 'patients'
  | 'appointments'
  | 'treatments'
  | 'invoices'
  | 'payments'
  | 'reports'
  | 'users'
  | 'settings';

export type PermissionAction = 'create' | 'read' | 'update' | 'delete';

interface Permission {
  module: PermissionModule;
  canCreate: boolean;
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

interface PermissionsContextType {
  permissions: Record<PermissionModule, Permission>;
  loading: boolean;
  hasPermission: (module: PermissionModule, action: PermissionAction) => boolean;
  canCreate: (module: PermissionModule) => boolean;
  canRead: (module: PermissionModule) => boolean;
  canUpdate: (module: PermissionModule) => boolean;
  canDelete: (module: PermissionModule) => boolean;
  refreshPermissions: () => Promise<void>;
}

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined);

export const PermissionsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [permissions, setPermissions] = useState<Record<PermissionModule, Permission>>({
    patients: { module: 'patients', canCreate: false, canRead: true, canUpdate: false, canDelete: false },
    appointments: { module: 'appointments', canCreate: false, canRead: true, canUpdate: false, canDelete: false },
    treatments: { module: 'treatments', canCreate: false, canRead: true, canUpdate: false, canDelete: false },
    invoices: { module: 'invoices', canCreate: false, canRead: true, canUpdate: false, canDelete: false },
    payments: { module: 'payments', canCreate: false, canRead: true, canUpdate: false, canDelete: false },
    reports: { module: 'reports', canCreate: false, canRead: false, canUpdate: false, canDelete: false },
    users: { module: 'users', canCreate: false, canRead: false, canUpdate: false, canDelete: false },
    settings: { module: 'settings', canCreate: false, canRead: false, canUpdate: false, canDelete: false },
  });
  const [loading, setLoading] = useState(true);

  const fetchPermissions = useCallback(async () => {
    if (!user || !isAuthenticated) {
      setLoading(false);
      return;
    }

    // Admin always has all permissions
    if (user.role === 'ADMIN') {
      const allPermissions: Record<PermissionModule, Permission> = {
        patients: { module: 'patients', canCreate: true, canRead: true, canUpdate: true, canDelete: true },
        appointments: { module: 'appointments', canCreate: true, canRead: true, canUpdate: true, canDelete: true },
        treatments: { module: 'treatments', canCreate: true, canRead: true, canUpdate: true, canDelete: true },
        invoices: { module: 'invoices', canCreate: true, canRead: true, canUpdate: true, canDelete: true },
        payments: { module: 'payments', canCreate: true, canRead: true, canUpdate: true, canDelete: true },
        reports: { module: 'reports', canCreate: true, canRead: true, canUpdate: true, canDelete: true },
        users: { module: 'users', canCreate: true, canRead: true, canUpdate: true, canDelete: true },
        settings: { module: 'settings', canCreate: true, canRead: true, canUpdate: true, canDelete: true },
      };
      setPermissions(allPermissions);
      setLoading(false);
      return;
    }

    try {
      const response = await usersApi.getPermissions(user.id);
      if (response.data.success) {
        const permissionsArray = response.data.data as Permission[];
        const permissionsMap: Record<PermissionModule, Permission> = {
          patients: { module: 'patients', canCreate: false, canRead: true, canUpdate: false, canDelete: false },
          appointments: { module: 'appointments', canCreate: false, canRead: true, canUpdate: false, canDelete: false },
          treatments: { module: 'treatments', canCreate: false, canRead: true, canUpdate: false, canDelete: false },
          invoices: { module: 'invoices', canCreate: false, canRead: true, canUpdate: false, canDelete: false },
          payments: { module: 'payments', canCreate: false, canRead: true, canUpdate: false, canDelete: false },
          reports: { module: 'reports', canCreate: false, canRead: false, canUpdate: false, canDelete: false },
          users: { module: 'users', canCreate: false, canRead: false, canUpdate: false, canDelete: false },
          settings: { module: 'settings', canCreate: false, canRead: false, canUpdate: false, canDelete: false },
        };

        permissionsArray.forEach((perm) => {
          if (perm.module in permissionsMap) {
            permissionsMap[perm.module] = perm;
          }
        });

        setPermissions(permissionsMap);
      }
    } catch (error) {
      console.error('Failed to fetch permissions:', error);
      // Use default permissions on error
    } finally {
      setLoading(false);
    }
  }, [user, isAuthenticated]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const hasPermission = useCallback(
    (module: PermissionModule, action: PermissionAction): boolean => {
      const modulePermission = permissions[module];
      if (!modulePermission) return false;

      switch (action) {
        case 'create':
          return modulePermission.canCreate;
        case 'read':
          return modulePermission.canRead;
        case 'update':
          return modulePermission.canUpdate;
        case 'delete':
          return modulePermission.canDelete;
        default:
          return false;
      }
    },
    [permissions]
  );

  const canCreate = useCallback(
    (module: PermissionModule) => hasPermission(module, 'create'),
    [hasPermission]
  );

  const canRead = useCallback(
    (module: PermissionModule) => hasPermission(module, 'read'),
    [hasPermission]
  );

  const canUpdate = useCallback(
    (module: PermissionModule) => hasPermission(module, 'update'),
    [hasPermission]
  );

  const canDelete = useCallback(
    (module: PermissionModule) => hasPermission(module, 'delete'),
    [hasPermission]
  );

  const value: PermissionsContextType = {
    permissions,
    loading,
    hasPermission,
    canCreate,
    canRead,
    canUpdate,
    canDelete,
    refreshPermissions: fetchPermissions,
  };

  return <PermissionsContext.Provider value={value}>{children}</PermissionsContext.Provider>;
};

export const usePermissions = (): PermissionsContextType => {
  const context = useContext(PermissionsContext);
  if (context === undefined) {
    throw new Error('usePermissions must be used within a PermissionsProvider');
  }
  return context;
};
