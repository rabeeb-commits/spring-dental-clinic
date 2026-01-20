import { usePermissions as usePermissionsContext, PermissionModule } from '../context/PermissionsContext';

export const usePermissions = () => {
  const { canCreate, canUpdate, canDelete, canRead } = usePermissionsContext();

  return {
    patients: {
      canCreate: canCreate('patients'),
      canRead: canRead('patients'),
      canUpdate: canUpdate('patients'),
      canDelete: canDelete('patients'),
    },
    appointments: {
      canCreate: canCreate('appointments'),
      canRead: canRead('appointments'),
      canUpdate: canUpdate('appointments'),
      canDelete: canDelete('appointments'),
    },
    treatments: {
      canCreate: canCreate('treatments'),
      canRead: canRead('treatments'),
      canUpdate: canUpdate('treatments'),
      canDelete: canDelete('treatments'),
    },
    invoices: {
      canCreate: canCreate('invoices'),
      canRead: canRead('invoices'),
      canUpdate: canUpdate('invoices'),
      canDelete: canDelete('invoices'),
    },
    payments: {
      canCreate: canCreate('payments'),
      canRead: canRead('payments'),
      canUpdate: canUpdate('payments'),
      canDelete: canDelete('payments'),
    },
    reports: {
      canCreate: canCreate('reports'),
      canRead: canRead('reports'),
      canUpdate: canUpdate('reports'),
      canDelete: canDelete('reports'),
    },
    users: {
      canCreate: canCreate('users'),
      canRead: canRead('users'),
      canUpdate: canUpdate('users'),
      canDelete: canDelete('users'),
    },
    settings: {
      canCreate: canCreate('settings'),
      canRead: canRead('settings'),
      canUpdate: canUpdate('settings'),
      canDelete: canDelete('settings'),
    },
  };
};
