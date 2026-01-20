import { Request, Response, NextFunction } from 'express';
import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

// Permission modules
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

// Default permissions based on role
const getDefaultPermissions = (role: UserRole): Record<PermissionModule, Permission> => {
  const basePermissions: Record<PermissionModule, Permission> = {
    patients: { module: 'patients', canCreate: false, canRead: true, canUpdate: false, canDelete: false },
    appointments: { module: 'appointments', canCreate: false, canRead: true, canUpdate: false, canDelete: false },
    treatments: { module: 'treatments', canCreate: false, canRead: true, canUpdate: false, canDelete: false },
    invoices: { module: 'invoices', canCreate: false, canRead: true, canUpdate: false, canDelete: false },
    payments: { module: 'payments', canCreate: false, canRead: true, canUpdate: false, canDelete: false },
    reports: { module: 'reports', canCreate: false, canRead: false, canUpdate: false, canDelete: false },
    users: { module: 'users', canCreate: false, canRead: false, canUpdate: false, canDelete: false },
    settings: { module: 'settings', canCreate: false, canRead: false, canUpdate: false, canDelete: false },
  };

  switch (role) {
    case 'ADMIN':
      // Admin has all permissions
      return Object.keys(basePermissions).reduce((acc, key) => {
        acc[key as PermissionModule] = {
          module: key as PermissionModule,
          canCreate: true,
          canRead: true,
          canUpdate: true,
          canDelete: true,
        };
        return acc;
      }, {} as Record<PermissionModule, Permission>);

    case 'DENTIST':
      return {
        ...basePermissions,
        patients: { module: 'patients', canCreate: true, canRead: true, canUpdate: true, canDelete: false },
        appointments: { module: 'appointments', canCreate: true, canRead: true, canUpdate: true, canDelete: false },
        treatments: { module: 'treatments', canCreate: true, canRead: true, canUpdate: true, canDelete: false },
        invoices: { module: 'invoices', canCreate: true, canRead: true, canUpdate: true, canDelete: false },
        payments: { module: 'payments', canCreate: true, canRead: true, canUpdate: false, canDelete: false },
        reports: { module: 'reports', canCreate: false, canRead: true, canUpdate: false, canDelete: false },
      };

    case 'RECEPTIONIST':
      return {
        ...basePermissions,
        patients: { module: 'patients', canCreate: true, canRead: true, canUpdate: true, canDelete: false },
        appointments: { module: 'appointments', canCreate: true, canRead: true, canUpdate: true, canDelete: false },
        invoices: { module: 'invoices', canCreate: true, canRead: true, canUpdate: true, canDelete: false },
        payments: { module: 'payments', canCreate: true, canRead: true, canUpdate: false, canDelete: false },
      };

    case 'ASSISTANT':
      // Read-only access
      return basePermissions;

    default:
      return basePermissions;
  }
};

// Get user permissions (custom or default)
export const getUserPermissions = async (userId: string, role: UserRole): Promise<Record<PermissionModule, Permission>> => {
  // Fetch custom permissions from database
  const customPermissions = await prisma.userPermission.findMany({
    where: { userId },
  });

  // Get default permissions for role
  const defaultPermissions = getDefaultPermissions(role);

  // If no custom permissions, return defaults
  if (customPermissions.length === 0) {
    return defaultPermissions;
  }

  // Merge custom permissions with defaults
  const permissions: Record<PermissionModule, Permission> = { ...defaultPermissions };

  customPermissions.forEach((perm) => {
    if (perm.module in permissions) {
      permissions[perm.module as PermissionModule] = {
        module: perm.module as PermissionModule,
        canCreate: perm.canCreate,
        canRead: perm.canRead,
        canUpdate: perm.canUpdate,
        canDelete: perm.canDelete,
      };
    }
  });

  return permissions;
};

// Check if user has specific permission
export const hasPermission = async (
  userId: string,
  role: UserRole,
  module: PermissionModule,
  action: PermissionAction
): Promise<boolean> => {
  // Admin always has all permissions
  if (role === 'ADMIN') {
    return true;
  }

  const permissions = await getUserPermissions(userId, role);
  const modulePermission = permissions[module];

  if (!modulePermission) {
    return false;
  }

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
};

// Permission checking middleware
export const checkPermission = (module: PermissionModule, action: PermissionAction) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
      return;
    }

    const allowed = await hasPermission(req.user.id, req.user.role, module, action);

    if (!allowed) {
      res.status(403).json({
        success: false,
        message: `Access denied. You don't have permission to ${action} ${module}.`,
      });
      return;
    }

    next();
  };
};
