import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  TextField,
  Button,
  Avatar,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Switch,
  Divider,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Skeleton,
  CircularProgress,
  MenuItem,
  InputAdornment,
  TablePagination,
  Card,
  CardContent,
  Checkbox,
  FormControlLabel,
  FormControl,
  InputLabel,
  Select,
} from '@mui/material';
import {
  Person as PersonIcon,
  Lock as LockIcon,
  Notifications as NotificationsIcon,
  Business as BusinessIcon,
  Save as SaveIcon,
  Edit as EditIcon,
  Backup as BackupIcon,
  CloudDownload as DownloadIcon,
  Restore as RestoreIcon,
  Delete as DeleteIcon,
  Security as SecurityIcon,
  Refresh as RefreshIcon,
  Close as CloseIcon,
  Add as AddIcon,
  People as PeopleIcon,
  Search as SearchIcon,
  Receipt as ReceiptIcon,
  ColorLens as ColorLensIcon,
  Preview as PreviewIcon,
  CloudUpload as CloudUploadIcon,
  DeleteOutline as DeleteOutlineIcon,
} from '@mui/icons-material';
import { useForm } from 'react-hook-form';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useClinic } from '../context/ClinicContext';
import { authApi, backupApi, usersApi, invoiceTemplatesApi, settingsApi } from '../services/api';
import { User, UserRole, Permission, PermissionModule, InvoiceTemplate } from '../types';
import { useInvoiceTemplate } from '../context/InvoiceTemplateContext';
import { generateInvoiceHTML } from '../components/invoice/InvoiceGenerator';
import { useDebounce } from '../hooks/useDebounce';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ConfirmDialog from '../components/common/ConfirmDialog';
import StatusBadge from '../components/common/StatusBadge';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div hidden={value !== index} style={{ paddingTop: 24 }}>
    {value === index && children}
  </div>
);

interface PasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface BackupFile {
  id: string;
  filename: string;
  createdAt: string;
  size: number;
}

// Common dental/medical emojis for clinic logo
const LOGO_OPTIONS = [
  '🦷', '😁', '🏥', '⚕️', '💊', '🩺', '🦴', '✨', 
  '💎', '🌟', '❤️', '💙', '💚', '🤍', '🔵', '🟢',
  '🅳', '🅲', '🆂', '🅼', '🅿️', '🅰️', '🅱️', '🆁',
];

const Settings: React.FC = () => {
  const { user } = useAuth();
  const { settings: clinicSettings, updateSettings } = useClinic();
  const { template, refreshTemplate, updateTemplate } = useInvoiceTemplate();
  const [activeTab, setActiveTab] = useState(0);
  const [changingPassword, setChangingPassword] = useState(false);
  const [logoDialogOpen, setLogoDialogOpen] = useState(false);
  const [tempLogo, setTempLogo] = useState(clinicSettings.logo);
  const [tempName, setTempName] = useState(clinicSettings.name);
  const [customLogoUrl, setCustomLogoUrl] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const logoFileInputRef = useRef<HTMLInputElement>(null);

  // Local state for clinic settings
  const [clinicName, setClinicName] = useState(clinicSettings.name);
  const [clinicPhone, setClinicPhone] = useState(clinicSettings.phone || '');
  const [clinicAddress, setClinicAddress] = useState(clinicSettings.address || '');
  const [clinicOpenTime, setClinicOpenTime] = useState(clinicSettings.openTime || '09:00');
  const [clinicCloseTime, setClinicCloseTime] = useState(clinicSettings.closeTime || '18:00');
  const [clinicUpiId, setClinicUpiId] = useState(clinicSettings.upiId || '');

  // Backup state
  const [backups, setBackups] = useState<BackupFile[]>([]);
  const [loadingBackups, setLoadingBackups] = useState(false);
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<BackupFile | null>(null);
  const [restoring, setRestoring] = useState(false);

  // User Management state
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalUsers, setTotalUsers] = useState(0);
  const [permissionDialogOpen, setPermissionDialogOpen] = useState(false);
  const [selectedUserForPermissions, setSelectedUserForPermissions] = useState<User | null>(null);
  const [userPermissions, setUserPermissions] = useState<Permission[]>([]);
  const [loadingPermissions, setLoadingPermissions] = useState(false);
  
  // Invoice Template Customization state
  const [invoiceTemplate, setInvoiceTemplate] = useState<InvoiceTemplate | null>(template);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string>('');
  
  // Debounce template changes for preview
  const debouncedTemplate = useDebounce(invoiceTemplate, 300);
  const debouncedClinicSettings = useDebounce(clinicSettings, 300);

  const passwordForm = useForm<PasswordFormData>();
  const userForm = useForm<{
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone: string;
    role: UserRole;
  }>();

  const isAdmin = user?.role === 'ADMIN';

  const fetchBackups = useCallback(async () => {
    if (!isAdmin) return;
    setLoadingBackups(true);
    try {
      const response = await backupApi.list();
      if (response.data.success) {
        setBackups(response.data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch backups:', error);
      toast.error('Failed to load backups. Please try again.');
    } finally {
      setLoadingBackups(false);
    }
  }, [isAdmin]);

  const fetchUsers = useCallback(async () => {
    if (!isAdmin) return;
    setLoadingUsers(true);
    try {
      const params: Record<string, string> = {
        page: (page + 1).toString(),
        limit: rowsPerPage.toString(),
      };
      if (searchQuery) {
        params.search = searchQuery;
      }
      if (roleFilter !== 'all') {
        params.role = roleFilter;
      }
      if (statusFilter !== 'all') {
        params.isActive = statusFilter === 'active' ? 'true' : 'false';
      }
      const response = await usersApi.getAll(params);
      if (response.data.success) {
        setUsers(response.data.data || []);
        setTotalUsers(response.data.total || 0);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
      toast.error('Failed to load users. Please try again.');
    } finally {
      setLoadingUsers(false);
    }
  }, [isAdmin, page, rowsPerPage, searchQuery, roleFilter, statusFilter]);

  useEffect(() => {
    if (activeTab === 4 && isAdmin) {
      // Invoice customization tab - template already loaded via context
    } else if (activeTab === 5 && isAdmin) {
      fetchBackups();
    } else if (activeTab === 6 && isAdmin) {
      fetchUsers();
    }
  }, [activeTab, isAdmin, fetchBackups, fetchUsers]);

  useEffect(() => {
    if (activeTab === 6 && isAdmin) {
      fetchUsers();
    }
  }, [page, rowsPerPage, searchQuery, roleFilter, statusFilter, fetchUsers]);

  const handlePasswordChange = async (data: PasswordFormData) => {
    if (data.newPassword !== data.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setChangingPassword(true);
    try {
      await authApi.changePassword(data.currentPassword, data.newPassword);
      toast.success('Password changed successfully');
      passwordForm.reset();
    } catch (error) {
      // Error handled by interceptor
    } finally {
      setChangingPassword(false);
    }
  };

  const handleSaveClinicSettings = () => {
    // Validate UPI ID format if provided
    if (clinicUpiId && !/^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(clinicUpiId)) {
      toast.error('Invalid UPI ID format. Use format: name@upi, name@paytm, etc.');
      return;
    }

    updateSettings({
      name: clinicName,
      phone: clinicPhone,
      address: clinicAddress,
      openTime: clinicOpenTime,
      closeTime: clinicCloseTime,
      upiId: clinicUpiId,
    });
    toast.success('Clinic settings saved successfully');
  };

  const handleSaveLogo = async () => {
    // If there's a file selected, upload it first
    const fileInput = logoFileInputRef.current;
    const file = fileInput?.files?.[0];
    
    if (file) {
      await handleUploadLogo();
      return;
    }

    // Otherwise, save URL or emoji
    const newLogo = customLogoUrl.trim() || tempLogo;
    updateSettings({ logo: newLogo, name: tempName });
    setLogoDialogOpen(false);
    setLogoPreview(null);
    toast.success('Clinic branding updated');
  };

  const handleOpenLogoDialog = () => {
    setTempLogo(clinicSettings.logo);
    setTempName(clinicSettings.name);
    if (clinicSettings.logo.startsWith('http')) {
      setCustomLogoUrl(clinicSettings.logo);
    } else if (clinicSettings.logo.startsWith('/uploads/')) {
      setCustomLogoUrl(clinicSettings.logo);
    } else {
      setCustomLogoUrl('');
    }
    setLogoPreview(null);
    setLogoDialogOpen(true);
  };

  const handleLogoFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file (JPG, PNG, GIF, or WebP)');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setLogoPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUploadLogo = async () => {
    const fileInput = logoFileInputRef.current;
    const file = fileInput?.files?.[0];
    
    if (!file) {
      // If no file selected, just save the URL/emoji
      handleSaveLogo();
      return;
    }

    setUploadingLogo(true);
    try {
      const response = await settingsApi.uploadLogo(file);
      if (response.data.success) {
        const logoPath = response.data.data.logoPath;
        updateSettings({ logo: logoPath });
        setTempLogo(logoPath);
        setLogoPreview(null);
        toast.success('Logo uploaded successfully');
        setLogoDialogOpen(false);
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to upload logo';
      toast.error(errorMessage);
    } finally {
      setUploadingLogo(false);
      // Reset file input
      if (fileInput) {
        fileInput.value = '';
      }
    }
  };

  const handleRemoveLogo = async () => {
    if (clinicSettings.logo.startsWith('/uploads/')) {
      try {
        await settingsApi.deleteLogo(clinicSettings.logo);
      } catch (error) {
        // Continue even if delete fails
      }
    }
    updateSettings({ logo: '🦷' });
    setTempLogo('🦷');
    setLogoPreview(null);
    setCustomLogoUrl('');
    toast.success('Logo removed');
  };

  const handleCreateBackup = async () => {
    setCreatingBackup(true);
    try {
      const response = await backupApi.create();
      if (response.data.success) {
        toast.success('Backup created successfully');
        fetchBackups();
      }
    } catch (error) {
      // Error handled by interceptor
    } finally {
      setCreatingBackup(false);
    }
  };

  const handleDownloadBackup = async (backup: BackupFile) => {
    try {
      const response = await backupApi.download(backup.id);
      const blob = new Blob([response.data], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = backup.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Backup downloaded');
    } catch (error) {
      toast.error('Failed to download backup');
    }
  };

  const handleRestoreClick = (backup: BackupFile) => {
    setSelectedBackup(backup);
    setRestoreDialogOpen(true);
  };

  const handleRestoreConfirm = async () => {
    if (!selectedBackup) return;
    setRestoring(true);
    try {
      await backupApi.restore(selectedBackup.id);
      toast.success('Restore initiated successfully');
      setRestoreDialogOpen(false);
    } catch (error) {
      // Error handled by interceptor
    } finally {
      setRestoring(false);
    }
  };

  const handleDeleteBackup = async (backup: BackupFile) => {
    if (!window.confirm(`Delete backup "${backup.filename}"?`)) return;
    try {
      await backupApi.delete(backup.id);
      toast.success('Backup deleted');
      fetchBackups();
    } catch (error) {
      // Error handled by interceptor
    }
  };

  // User Management Handlers
  const handleOpenUserDialog = (userToEdit?: User) => {
    if (userToEdit) {
      setEditingUser(userToEdit);
      userForm.reset({
        email: userToEdit.email,
        password: '',
        firstName: userToEdit.firstName,
        lastName: userToEdit.lastName,
        phone: userToEdit.phone || '',
        role: userToEdit.role,
      });
    } else {
      setEditingUser(null);
      userForm.reset({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        phone: '',
        role: 'RECEPTIONIST',
      });
    }
    setUserDialogOpen(true);
  };

  const handleCloseUserDialog = () => {
    setUserDialogOpen(false);
    setEditingUser(null);
    userForm.reset();
  };

  const handleCreateUser = async (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone: string;
    role: UserRole;
  }) => {
    setSubmitting(true);
    try {
      await usersApi.create({
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone || undefined,
        role: data.role,
      });
      toast.success('User created successfully');
      handleCloseUserDialog();
      fetchUsers();
    } catch (error) {
      // Error handled by interceptor
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateUser = async (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone: string;
    role: UserRole;
  }) => {
    if (!editingUser) return;
    setSubmitting(true);
    try {
      const updateData: any = {
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone || undefined,
        role: data.role,
      };
      // Only include password if provided (not empty)
      if (data.password && data.password.trim() !== '') {
        updateData.password = data.password;
      }
      await usersApi.update(editingUser.id, updateData);
      toast.success('User updated successfully');
      handleCloseUserDialog();
      fetchUsers();
    } catch (error) {
      // Error handled by interceptor
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = (userToDelete: User) => {
    if (userToDelete.id === user?.id) {
      toast.error('Cannot deactivate your own account');
      return;
    }
    setUserToDelete(userToDelete);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;
    try {
      await usersApi.delete(userToDelete.id);
      toast.success('User deactivated successfully');
      setDeleteDialogOpen(false);
      setUserToDelete(null);
      fetchUsers();
    } catch (error) {
      // Error handled by interceptor
    }
  };

  const handleOpenPermissionDialog = async (userItem: User) => {
    setSelectedUserForPermissions(userItem);
    setLoadingPermissions(true);
    try {
      const response = await usersApi.getPermissions(userItem.id);
      if (response.data.success) {
        setUserPermissions(response.data.data || []);
        setPermissionDialogOpen(true);
      }
    } catch (error) {
      toast.error('Failed to load permissions');
    } finally {
      setLoadingPermissions(false);
    }
  };

  const handleSavePermissions = async () => {
    if (!selectedUserForPermissions) return;
    setSubmitting(true);
    try {
      await usersApi.updatePermissions(selectedUserForPermissions.id, userPermissions as unknown as Record<string, unknown>[]);
      toast.success('Permissions updated successfully');
      setPermissionDialogOpen(false);
      setSelectedUserForPermissions(null);
    } catch (error) {
      // Error handled by interceptor
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPermissions = async () => {
    if (!selectedUserForPermissions) return;
    setSubmitting(true);
    try {
      await usersApi.resetPermissions(selectedUserForPermissions.id);
      toast.success('Permissions reset to role defaults');
      // Reload permissions
      const response = await usersApi.getPermissions(selectedUserForPermissions.id);
      if (response.data.success) {
        setUserPermissions(response.data.data || []);
      }
    } catch (error) {
      // Error handled by interceptor
    } finally {
      setSubmitting(false);
    }
  };

  const handlePermissionChange = (module: PermissionModule, field: 'canCreate' | 'canRead' | 'canUpdate' | 'canDelete', value: boolean) => {
    setUserPermissions((prev) => {
      const existing = prev.find((p) => p.module === module);
      if (existing) {
        return prev.map((p) => (p.module === module ? { ...p, [field]: value } : p));
      } else {
        return [
          ...prev,
          {
            module,
            canCreate: field === 'canCreate' ? value : false,
            canRead: field === 'canRead' ? value : true,
            canUpdate: field === 'canUpdate' ? value : false,
            canDelete: field === 'canDelete' ? value : false,
          },
        ];
      }
    });
  };

  const getPermissionForModule = (module: PermissionModule): Permission => {
    return userPermissions.find((p) => p.module === module) || {
      module,
      canCreate: false,
      canRead: true,
      canUpdate: false,
      canDelete: false,
    };
  };

  // Invoice Template handlers
  useEffect(() => {
    if (template) {
      setInvoiceTemplate(template);
    }
  }, [template]);

  // Generate preview HTML when template or clinic settings change
  useEffect(() => {
    if (debouncedTemplate && (previewDialogOpen || activeTab === 4)) {
      const sampleInvoice = {
        id: 'preview',
        invoiceNumber: 'INV-2024-0001',
        patientId: 'PAT-2024-0001',
        subtotal: 5000,
        discount: 500,
        tax: 900,
        totalAmount: 5400,
        paidAmount: 2000,
        dueAmount: 3400,
        status: 'PARTIAL',
        createdAt: new Date().toISOString(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        patient: {
          id: 'preview',
          patientId: 'PAT-2024-0001',
          firstName: 'John',
          lastName: 'Doe',
          phone: '9876543210',
        },
        items: [
          { id: '1', description: 'Dental Cleaning', quantity: 1, unitPrice: 2000, amount: 2000 },
          { id: '2', description: 'X-Ray', quantity: 2, unitPrice: 500, amount: 1000 },
          { id: '3', description: 'Filling', quantity: 1, unitPrice: 2000, amount: 2000 },
        ],
        payments: [
          {
            id: '1',
            amount: 2000,
            paymentMode: 'CASH',
            paymentDate: new Date().toISOString(),
            receivedBy: { id: '1', firstName: 'Admin', lastName: 'User' },
          },
        ],
        notes: 'Sample invoice for preview',
      } as any;

      const html = generateInvoiceHTML({
        invoice: sampleInvoice,
        template: debouncedTemplate,
        clinicSettings: {
          name: debouncedClinicSettings.name,
          logo: debouncedClinicSettings.logo,
          phone: debouncedClinicSettings.phone,
          address: debouncedClinicSettings.address,
        },
      });
      setPreviewHtml(html);
    }
  }, [debouncedTemplate, debouncedClinicSettings, previewDialogOpen, activeTab]);

  const handleSaveInvoiceTemplate = async () => {
    if (!invoiceTemplate) return;
    setSavingTemplate(true);
    try {
      if (invoiceTemplate.id) {
        await invoiceTemplatesApi.update(invoiceTemplate.id, invoiceTemplate as unknown as Record<string, unknown>);
      } else {
        const response = await invoiceTemplatesApi.create(invoiceTemplate as unknown as Record<string, unknown>);
        if (response.data.success) {
          setInvoiceTemplate(response.data.data);
        }
      }
      toast.success('Invoice template saved successfully');
      await refreshTemplate();
    } catch (error) {
      // Error handled by interceptor
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleResetInvoiceTemplate = async () => {
    if (window.confirm('Reset invoice template to default settings? This cannot be undone.')) {
      try {
        const response = await invoiceTemplatesApi.getDefault();
        if (response.data.success) {
          setInvoiceTemplate(response.data.data);
          toast.success('Template reset to defaults');
        }
      } catch (error) {
        toast.error('Failed to reset template');
      }
    }
  };

  const getRoleColor = (role: UserRole): string => {
    const colors: Record<UserRole, string> = {
      ADMIN: '#ef4444',
      DENTIST: '#3b82f6',
      RECEPTIONIST: '#22c55e',
      ASSISTANT: '#f59e0b',
    };
    return colors[role] || '#64748b';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Box className="animate-fade-in">
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={600}>
          Settings
        </Typography>
        <Typography color="text.secondary" variant="body2">
          Manage your account and preferences
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Sidebar */}
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Avatar
              sx={{
                width: 100,
                height: 100,
                mx: 'auto',
                mb: 2,
                bgcolor: '#0891b2',
                fontSize: '2rem',
                fontWeight: 600,
              }}
            >
              {user?.firstName?.[0]}
              {user?.lastName?.[0]}
            </Avatar>
            <Typography variant="h6" fontWeight={600}>
              {user?.firstName} {user?.lastName}
            </Typography>
            <Typography color="text.secondary" variant="body2">
              {user?.email}
            </Typography>
            <Typography
              sx={{
                mt: 1,
                display: 'inline-block',
                px: 2,
                py: 0.5,
                borderRadius: 2,
                bgcolor: '#0891b215',
                color: '#0891b2',
                fontWeight: 500,
                fontSize: '0.8rem',
              }}
            >
              {user?.role}
            </Typography>
          </Paper>
        </Grid>

        {/* Main Content */}
        <Grid item xs={12} md={9}>
          <Paper>
            <Tabs
              value={activeTab}
              onChange={(_, newValue) => setActiveTab(newValue)}
              sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
              variant="scrollable"
              scrollButtons="auto"
            >
              <Tab icon={<PersonIcon />} label="Profile" iconPosition="start" />
              <Tab icon={<LockIcon />} label="Security" iconPosition="start" />
              <Tab icon={<NotificationsIcon />} label="Notifications" iconPosition="start" />
              <Tab icon={<BusinessIcon />} label="Clinic" iconPosition="start" />
              {isAdmin && <Tab icon={<ReceiptIcon />} label="Invoice" iconPosition="start" />}
              {isAdmin && <Tab icon={<BackupIcon />} label="Backup" iconPosition="start" />}
              {isAdmin && <Tab icon={<PeopleIcon />} label="Users" iconPosition="start" />}
            </Tabs>

            <Box sx={{ p: 3 }}>
              {/* Profile Tab */}
              <TabPanel value={activeTab} index={0}>
                <Typography variant="h6" fontWeight={600} sx={{ mb: 3 }}>
                  Profile Information
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="First Name"
                      defaultValue={user?.firstName}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Last Name"
                      defaultValue={user?.lastName}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Email"
                      type="email"
                      defaultValue={user?.email}
                      disabled
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Phone"
                      defaultValue=""
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Button variant="contained" startIcon={<SaveIcon />}>
                      Save Changes
                    </Button>
                  </Grid>
                </Grid>
              </TabPanel>

              {/* Security Tab */}
              <TabPanel value={activeTab} index={1}>
                <Typography variant="h6" fontWeight={600} sx={{ mb: 3 }}>
                  Change Password
                </Typography>
                <Box
                  component="form"
                  onSubmit={passwordForm.handleSubmit(handlePasswordChange)}
                  sx={{ maxWidth: 400 }}
                >
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        type="password"
                        label="Current Password"
                        {...passwordForm.register('currentPassword', { required: true })}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        type="password"
                        label="New Password"
                        {...passwordForm.register('newPassword', {
                          required: true,
                          minLength: {
                            value: 6,
                            message: 'Password must be at least 6 characters',
                          },
                        })}
                        helperText="Minimum 6 characters"
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        type="password"
                        label="Confirm New Password"
                        {...passwordForm.register('confirmPassword', { required: true })}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <Button
                        type="submit"
                        variant="contained"
                        disabled={changingPassword}
                      >
                        {changingPassword ? 'Changing...' : 'Change Password'}
                      </Button>
                    </Grid>
                  </Grid>
                </Box>
              </TabPanel>

              {/* Notifications Tab */}
              <TabPanel value={activeTab} index={2}>
                <Typography variant="h6" fontWeight={600} sx={{ mb: 3 }}>
                  Notification Preferences
                </Typography>
                <List>
                  <ListItem>
                    <ListItemText
                      primary="Email Notifications"
                      secondary="Receive email for important updates"
                    />
                    <ListItemSecondaryAction>
                      <Switch defaultChecked />
                    </ListItemSecondaryAction>
                  </ListItem>
                  <Divider />
                  <ListItem>
                    <ListItemText
                      primary="Appointment Reminders"
                      secondary="Get reminders for upcoming appointments"
                    />
                    <ListItemSecondaryAction>
                      <Switch defaultChecked />
                    </ListItemSecondaryAction>
                  </ListItem>
                  <Divider />
                  <ListItem>
                    <ListItemText
                      primary="Payment Alerts"
                      secondary="Notifications for pending payments"
                    />
                    <ListItemSecondaryAction>
                      <Switch defaultChecked />
                    </ListItemSecondaryAction>
                  </ListItem>
                  <Divider />
                  <ListItem>
                    <ListItemText
                      primary="Daily Summary"
                      secondary="Receive daily clinic summary report"
                    />
                    <ListItemSecondaryAction>
                      <Switch />
                    </ListItemSecondaryAction>
                  </ListItem>
                </List>
              </TabPanel>

              {/* Clinic Tab */}
              <TabPanel value={activeTab} index={3}>
                <Typography variant="h6" fontWeight={600} sx={{ mb: 3 }}>
                  Clinic Settings
                </Typography>

                {/* Clinic Branding Section */}
                <Paper
                  variant="outlined"
                  sx={{
                    p: 3,
                    mb: 3,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 3,
                    bgcolor: '#f8fafc',
                  }}
                >
                  <Box
                    sx={{
                      width: 80,
                      height: 80,
                      borderRadius: 3,
                      background: 'linear-gradient(135deg, #0891b2 0%, #22d3ee 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: (clinicSettings.logo.startsWith('http') || clinicSettings.logo.startsWith('/uploads/')) ? '0' : '2.5rem',
                      overflow: 'hidden',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    }}
                  >
                    {clinicSettings.logo.startsWith('/uploads/') ? (
                      <img
                        src={`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${clinicSettings.logo}`}
                        alt="Clinic Logo"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : clinicSettings.logo.startsWith('http') ? (
                      <img
                        src={clinicSettings.logo}
                        alt="Clinic Logo"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      clinicSettings.logo
                    )}
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h5" fontWeight={700} sx={{ mb: 0.5 }}>
                      {clinicSettings.name}
                    </Typography>
                    <Typography color="text.secondary" variant="body2">
                      This is how your clinic appears in the sidebar and reports
                    </Typography>
                  </Box>
                  <Tooltip title="Edit Logo & Name">
                    <IconButton
                      onClick={handleOpenLogoDialog}
                      sx={{
                        bgcolor: '#0891b2',
                        color: '#fff',
                        '&:hover': { bgcolor: '#0e7490' },
                      }}
                    >
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                </Paper>

                <Divider sx={{ mb: 3 }} />

                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Clinic Name"
                      value={clinicName}
                      onChange={(e) => setClinicName(e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Phone"
                      value={clinicPhone}
                      onChange={(e) => setClinicPhone(e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Address"
                      multiline
                      rows={2}
                      value={clinicAddress}
                      onChange={(e) => setClinicAddress(e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Opening Time"
                      type="time"
                      value={clinicOpenTime}
                      onChange={(e) => setClinicOpenTime(e.target.value)}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Closing Time"
                      type="time"
                      value={clinicCloseTime}
                      onChange={(e) => setClinicCloseTime(e.target.value)}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="UPI ID"
                      placeholder="e.g., dentalclinic@upi, clinic@paytm"
                      value={clinicUpiId}
                      onChange={(e) => setClinicUpiId(e.target.value)}
                      helperText="Enter your clinic's UPI ID for QR code payments (format: name@upi, name@paytm, etc.)"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Button
                      variant="contained"
                      startIcon={<SaveIcon />}
                      onClick={handleSaveClinicSettings}
                    >
                      Save Clinic Settings
                    </Button>
                  </Grid>
                </Grid>
              </TabPanel>

              {/* Invoice Customization Tab - Admin Only */}
              {isAdmin && (
                <TabPanel value={activeTab} index={4}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Box>
                      <Typography variant="h6" fontWeight={600}>
                        Invoice Customization
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Customize invoice layout, design, and content
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        variant="outlined"
                        startIcon={<PreviewIcon />}
                        onClick={() => setPreviewDialogOpen(true)}
                      >
                        Preview
                      </Button>
                      <Button
                        variant="outlined"
                        startIcon={<RefreshIcon />}
                        onClick={handleResetInvoiceTemplate}
                      >
                        Reset
                      </Button>
                      <Button
                        variant="contained"
                        startIcon={<SaveIcon />}
                        onClick={handleSaveInvoiceTemplate}
                        disabled={savingTemplate || !invoiceTemplate}
                      >
                        {savingTemplate ? 'Saving...' : 'Save Template'}
                      </Button>
                    </Box>
                  </Box>

                  {invoiceTemplate ? (
                    <Grid container spacing={3}>
                      {/* Template Style Selection */}
                      <Grid item xs={12}>
                        <Card>
                          <CardContent>
                            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                              Template Style
                            </Typography>
                            <Grid container spacing={2}>
                              {(['classic', 'modern', 'minimal'] as const).map((style) => (
                                <Grid item xs={12} sm={4} key={style}>
                                  <Paper
                                    variant={invoiceTemplate.templateStyle === style ? 'elevation' : 'outlined'}
                                    sx={{
                                      p: 2,
                                      cursor: 'pointer',
                                      border: invoiceTemplate.templateStyle === style ? `2px solid ${invoiceTemplate.primaryColor}` : '1px solid #e2e8f0',
                                      '&:hover': { borderColor: invoiceTemplate.primaryColor },
                                    }}
                                    onClick={() => setInvoiceTemplate({ ...invoiceTemplate, templateStyle: style })}
                                  >
                                    <Typography variant="h6" sx={{ textTransform: 'capitalize', mb: 1 }}>
                                      {style}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      {style === 'classic' && 'Traditional bordered table, formal layout'}
                                      {style === 'modern' && 'Clean lines, subtle colors, spacious'}
                                      {style === 'minimal' && 'Minimal borders, focus on content'}
                                    </Typography>
                                  </Paper>
                                </Grid>
                              ))}
                            </Grid>
                          </CardContent>
                        </Card>
                      </Grid>

                      {/* Header Customization */}
                      <Grid item xs={12} md={6}>
                        <Card>
                          <CardContent>
                            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                              Header Settings
                            </Typography>
                            <Grid container spacing={2}>
                              <Grid item xs={12}>
                                <Alert severity="info" sx={{ mb: 2 }}>
                                  Logo is managed in Clinic Settings tab. Upload an image file or use an emoji.
                                </Alert>
                              </Grid>
                              <Grid item xs={12}>
                                <FormControl fullWidth>
                                  <InputLabel>Logo Position</InputLabel>
                                  <Select
                                    value={invoiceTemplate.logoPosition}
                                    label="Logo Position"
                                    onChange={(e) => setInvoiceTemplate({ ...invoiceTemplate, logoPosition: e.target.value as 'left' | 'center' | 'right' })}
                                  >
                                    <MenuItem value="left">Left</MenuItem>
                                    <MenuItem value="center">Center</MenuItem>
                                    <MenuItem value="right">Right</MenuItem>
                                  </Select>
                                </FormControl>
                              </Grid>
                              <Grid item xs={12}>
                                <FormControlLabel
                                  control={
                                    <Switch
                                      checked={invoiceTemplate.showClinicName}
                                      onChange={(e) => setInvoiceTemplate({ ...invoiceTemplate, showClinicName: e.target.checked })}
                                    />
                                  }
                                  label="Show Clinic Name"
                                />
                              </Grid>
                              <Grid item xs={12}>
                                <FormControlLabel
                                  control={
                                    <Switch
                                      checked={invoiceTemplate.showAddress}
                                      onChange={(e) => setInvoiceTemplate({ ...invoiceTemplate, showAddress: e.target.checked })}
                                    />
                                  }
                                  label="Show Address"
                                />
                              </Grid>
                              <Grid item xs={12}>
                                <FormControlLabel
                                  control={
                                    <Switch
                                      checked={invoiceTemplate.showContact}
                                      onChange={(e) => setInvoiceTemplate({ ...invoiceTemplate, showContact: e.target.checked })}
                                    />
                                  }
                                  label="Show Contact Info"
                                />
                              </Grid>
                            </Grid>
                          </CardContent>
                        </Card>
                      </Grid>

                      {/* Layout Settings */}
                      <Grid item xs={12} md={6}>
                        <Card>
                          <CardContent>
                            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                              Layout Settings
                            </Typography>
                            <Grid container spacing={2}>
                              <Grid item xs={12}>
                                <FormControl fullWidth>
                                  <InputLabel>Table Style</InputLabel>
                                  <Select
                                    value={invoiceTemplate.itemTableStyle}
                                    label="Table Style"
                                    onChange={(e) => setInvoiceTemplate({ ...invoiceTemplate, itemTableStyle: e.target.value as 'bordered' | 'striped' | 'minimal' })}
                                  >
                                    <MenuItem value="bordered">Bordered</MenuItem>
                                    <MenuItem value="striped">Striped</MenuItem>
                                    <MenuItem value="minimal">Minimal</MenuItem>
                                  </Select>
                                </FormControl>
                              </Grid>
                              <Grid item xs={12}>
                                <FormControl fullWidth>
                                  <InputLabel>Totals Position</InputLabel>
                                  <Select
                                    value={invoiceTemplate.totalsPosition}
                                    label="Totals Position"
                                    onChange={(e) => setInvoiceTemplate({ ...invoiceTemplate, totalsPosition: e.target.value as 'left' | 'right' | 'center' })}
                                  >
                                    <MenuItem value="left">Left</MenuItem>
                                    <MenuItem value="center">Center</MenuItem>
                                    <MenuItem value="right">Right</MenuItem>
                                  </Select>
                                </FormControl>
                              </Grid>
                            </Grid>
                          </CardContent>
                        </Card>
                      </Grid>

                      {/* Payment Terms */}
                      <Grid item xs={12} md={6}>
                        <Card>
                          <CardContent>
                            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                              Payment Terms
                            </Typography>
                            <Grid container spacing={2}>
                              <Grid item xs={12}>
                                <TextField
                                  fullWidth
                                  multiline
                                  rows={4}
                                  label="Payment Terms"
                                  value={invoiceTemplate.paymentTerms || ''}
                                  onChange={(e) => setInvoiceTemplate({ ...invoiceTemplate, paymentTerms: e.target.value })}
                                  placeholder="e.g., Payment is due within 30 days. Late payments may incur fees."
                                />
                              </Grid>
                              <Grid item xs={12}>
                                <FormControlLabel
                                  control={
                                    <Switch
                                      checked={invoiceTemplate.showDueDate}
                                      onChange={(e) => setInvoiceTemplate({ ...invoiceTemplate, showDueDate: e.target.checked })}
                                    />
                                  }
                                  label="Show Due Date"
                                />
                              </Grid>
                              <Grid item xs={12}>
                                <FormControlLabel
                                  control={
                                    <Switch
                                      checked={invoiceTemplate.showPaymentMethods}
                                      onChange={(e) => setInvoiceTemplate({ ...invoiceTemplate, showPaymentMethods: e.target.checked })}
                                    />
                                  }
                                  label="Show Payment History"
                                />
                              </Grid>
                              <Grid item xs={12}>
                                <FormControlLabel
                                  control={
                                    <Switch
                                      checked={invoiceTemplate.lateFeeEnabled}
                                      onChange={(e) => setInvoiceTemplate({ ...invoiceTemplate, lateFeeEnabled: e.target.checked })}
                                    />
                                  }
                                  label="Enable Late Fee"
                                />
                              </Grid>
                              {invoiceTemplate.lateFeeEnabled && (
                                <>
                                  <Grid item xs={6}>
                                    <TextField
                                      fullWidth
                                      type="number"
                                      label="Late Fee %"
                                      value={invoiceTemplate.lateFeePercent || 0}
                                      onChange={(e) => setInvoiceTemplate({ ...invoiceTemplate, lateFeePercent: parseFloat(e.target.value) || 0 })}
                                      inputProps={{ min: 0, max: 100, step: 0.1 }}
                                    />
                                  </Grid>
                                  <Grid item xs={6}>
                                    <TextField
                                      fullWidth
                                      type="number"
                                      label="Days Before Fee"
                                      value={invoiceTemplate.lateFeeDays || 30}
                                      onChange={(e) => setInvoiceTemplate({ ...invoiceTemplate, lateFeeDays: parseInt(e.target.value) || 30 })}
                                      inputProps={{ min: 1 }}
                                    />
                                  </Grid>
                                </>
                              )}
                            </Grid>
                          </CardContent>
                        </Card>
                      </Grid>

                      {/* Tax Settings */}
                      <Grid item xs={12} md={6}>
                        <Card>
                          <CardContent>
                            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                              Tax Settings
                            </Typography>
                            <Grid container spacing={2}>
                              <Grid item xs={12}>
                                <TextField
                                  fullWidth
                                  label="Tax Label"
                                  value={invoiceTemplate.taxLabel}
                                  onChange={(e) => setInvoiceTemplate({ ...invoiceTemplate, taxLabel: e.target.value })}
                                  placeholder="GST, VAT, Service Tax, etc."
                                />
                              </Grid>
                              <Grid item xs={12}>
                                <FormControl fullWidth>
                                  <InputLabel>Tax Type</InputLabel>
                                  <Select
                                    value={invoiceTemplate.taxType}
                                    label="Tax Type"
                                    onChange={(e) => setInvoiceTemplate({ ...invoiceTemplate, taxType: e.target.value as 'percentage' | 'fixed' })}
                                  >
                                    <MenuItem value="percentage">Percentage</MenuItem>
                                    <MenuItem value="fixed">Fixed Amount</MenuItem>
                                  </Select>
                                </FormControl>
                              </Grid>
                              <Grid item xs={12}>
                                <TextField
                                  fullWidth
                                  label="Tax ID / Registration Number"
                                  value={invoiceTemplate.taxId || ''}
                                  onChange={(e) => setInvoiceTemplate({ ...invoiceTemplate, taxId: e.target.value })}
                                  placeholder="GSTIN, VAT No., etc."
                                />
                              </Grid>
                              <Grid item xs={12}>
                                <FormControlLabel
                                  control={
                                    <Switch
                                      checked={invoiceTemplate.showTaxBreakdown}
                                      onChange={(e) => setInvoiceTemplate({ ...invoiceTemplate, showTaxBreakdown: e.target.checked })}
                                    />
                                  }
                                  label="Show Tax Breakdown"
                                />
                              </Grid>
                            </Grid>
                          </CardContent>
                        </Card>
                      </Grid>

                      {/* Footer Settings */}
                      <Grid item xs={12} md={6}>
                        <Card>
                          <CardContent>
                            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                              Footer Settings
                            </Typography>
                            <Grid container spacing={2}>
                              <Grid item xs={12}>
                                <TextField
                                  fullWidth
                                  multiline
                                  rows={4}
                                  label="Footer Text"
                                  value={invoiceTemplate.footerText || ''}
                                  onChange={(e) => setInvoiceTemplate({ ...invoiceTemplate, footerText: e.target.value })}
                                  placeholder="Terms & conditions, thank you message, etc."
                                />
                              </Grid>
                              <Grid item xs={12}>
                                <FormControlLabel
                                  control={
                                    <Switch
                                      checked={invoiceTemplate.showSignature}
                                      onChange={(e) => setInvoiceTemplate({ ...invoiceTemplate, showSignature: e.target.checked })}
                                    />
                                  }
                                  label="Show Signature Line"
                                />
                              </Grid>
                              {invoiceTemplate.showSignature && (
                                <Grid item xs={12}>
                                  <TextField
                                    fullWidth
                                    label="Signature Label"
                                    value={invoiceTemplate.signatureLabel || 'Authorized Signature'}
                                    onChange={(e) => setInvoiceTemplate({ ...invoiceTemplate, signatureLabel: e.target.value })}
                                  />
                                </Grid>
                              )}
                            </Grid>
                          </CardContent>
                        </Card>
                      </Grid>

                      {/* Colors & Styling */}
                      <Grid item xs={12} md={6}>
                        <Card>
                          <CardContent>
                            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                              Colors & Styling
                            </Typography>
                            <Grid container spacing={2}>
                              <Grid item xs={12}>
                                <TextField
                                  fullWidth
                                  type="color"
                                  label="Primary Color"
                                  value={invoiceTemplate.primaryColor}
                                  onChange={(e) => setInvoiceTemplate({ ...invoiceTemplate, primaryColor: e.target.value })}
                                  InputLabelProps={{ shrink: true }}
                                />
                              </Grid>
                              <Grid item xs={12}>
                                <TextField
                                  fullWidth
                                  type="color"
                                  label="Header Background"
                                  value={invoiceTemplate.headerBgColor || '#ffffff'}
                                  onChange={(e) => setInvoiceTemplate({ ...invoiceTemplate, headerBgColor: e.target.value || undefined })}
                                  InputLabelProps={{ shrink: true }}
                                />
                              </Grid>
                              <Grid item xs={12}>
                                <TextField
                                  fullWidth
                                  type="color"
                                  label="Footer Background"
                                  value={invoiceTemplate.footerBgColor || '#ffffff'}
                                  onChange={(e) => setInvoiceTemplate({ ...invoiceTemplate, footerBgColor: e.target.value || undefined })}
                                  InputLabelProps={{ shrink: true }}
                                />
                              </Grid>
                              <Grid item xs={12}>
                                <FormControl fullWidth>
                                  <InputLabel>Font Family</InputLabel>
                                  <Select
                                    value={invoiceTemplate.fontFamily}
                                    label="Font Family"
                                    onChange={(e) => setInvoiceTemplate({ ...invoiceTemplate, fontFamily: e.target.value })}
                                  >
                                    <MenuItem value="Arial, sans-serif">Arial</MenuItem>
                                    <MenuItem value="'Times New Roman', serif">Times New Roman</MenuItem>
                                    <MenuItem value="'Courier New', monospace">Courier New</MenuItem>
                                    <MenuItem value="Georgia, serif">Georgia</MenuItem>
                                    <MenuItem value="Verdana, sans-serif">Verdana</MenuItem>
                                    <MenuItem value="'Trebuchet MS', sans-serif">Trebuchet MS</MenuItem>
                                  </Select>
                                </FormControl>
                              </Grid>
                            </Grid>
                          </CardContent>
                        </Card>
                      </Grid>
                    </Grid>
                  ) : (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                      <CircularProgress />
                    </Box>
                  )}
                </TabPanel>
              )}

              {/* Backup Tab - Admin Only */}
              {isAdmin && (
                <TabPanel value={activeTab} index={5}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Box>
                      <Typography variant="h6" fontWeight={600}>
                        Backup & Restore
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Create and manage database backups
                      </Typography>
                    </Box>
                    <Button
                      variant="contained"
                      startIcon={creatingBackup ? <CircularProgress size={20} color="inherit" /> : <AddIcon />}
                      onClick={handleCreateBackup}
                      disabled={creatingBackup}
                    >
                      {creatingBackup ? 'Creating...' : 'Create Backup'}
                    </Button>
                  </Box>

                  <Alert severity="info" sx={{ mb: 3 }}>
                    Backups include all patient data, appointments, treatments, invoices, and settings. 
                    Store downloaded backups securely.
                  </Alert>

                  {loadingBackups ? (
                    <Box>
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} variant="rounded" height={60} sx={{ mb: 1 }} />
                      ))}
                    </Box>
                  ) : backups.length === 0 ? (
                    <Paper sx={{ p: 6, textAlign: 'center' }}>
                      <BackupIcon sx={{ fontSize: 64, color: '#94a3b8', mb: 2 }} />
                      <Typography color="text.secondary">No backups yet</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Click "Create Backup" to create your first backup
                      </Typography>
                    </Paper>
                  ) : (
                    <TableContainer component={Paper} variant="outlined">
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>Backup Name</TableCell>
                            <TableCell>Created</TableCell>
                            <TableCell>Size</TableCell>
                            <TableCell align="right">Actions</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {backups.map((backup) => (
                            <TableRow key={backup.id} hover>
                              <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <BackupIcon sx={{ color: '#64748b' }} />
                                  <Typography variant="body2" fontWeight={500}>
                                    {backup.filename}
                                  </Typography>
                                </Box>
                              </TableCell>
                              <TableCell>
                                {format(new Date(backup.createdAt), 'PPp')}
                              </TableCell>
                              <TableCell>
                                <Chip 
                                  label={formatFileSize(backup.size)} 
                                  size="small" 
                                  sx={{ bgcolor: '#e2e8f0' }} 
                                />
                              </TableCell>
                              <TableCell align="right">
                                <Tooltip title="Download">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleDownloadBackup(backup)}
                                  >
                                    <DownloadIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Restore">
                                  <IconButton
                                    size="small"
                                    color="primary"
                                    onClick={() => handleRestoreClick(backup)}
                                  >
                                    <RestoreIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Delete">
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() => handleDeleteBackup(backup)}
                                  >
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </TabPanel>
              )}

              {/* Users Tab - Admin Only */}
              {isAdmin && (
                <TabPanel value={activeTab} index={5}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Box>
                      <Typography variant="h6" fontWeight={600}>
                        User Management
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Create and manage user accounts with roles and permissions
                      </Typography>
                    </Box>
                    <Button
                      variant="contained"
                      startIcon={<AddIcon />}
                      onClick={() => handleOpenUserDialog()}
                    >
                      Add User
                    </Button>
                  </Box>

                  {/* Filters */}
                  <Card variant="outlined" sx={{ mb: 3 }}>
                    <CardContent>
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={4}>
                          <TextField
                            fullWidth
                            size="small"
                            placeholder="Search users..."
                            value={searchQuery}
                            onChange={(e) => {
                              setSearchQuery(e.target.value);
                              setPage(0);
                            }}
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start">
                                  <SearchIcon fontSize="small" />
                                </InputAdornment>
                              ),
                            }}
                          />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <TextField
                            select
                            fullWidth
                            size="small"
                            label="Role"
                            value={roleFilter}
                            onChange={(e) => {
                              setRoleFilter(e.target.value);
                              setPage(0);
                            }}
                          >
                            <MenuItem value="all">All Roles</MenuItem>
                            <MenuItem value="ADMIN">Admin</MenuItem>
                            <MenuItem value="DENTIST">Dentist</MenuItem>
                            <MenuItem value="RECEPTIONIST">Receptionist</MenuItem>
                            <MenuItem value="ASSISTANT">Assistant</MenuItem>
                          </TextField>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <TextField
                            select
                            fullWidth
                            size="small"
                            label="Status"
                            value={statusFilter}
                            onChange={(e) => {
                              setStatusFilter(e.target.value);
                              setPage(0);
                            }}
                          >
                            <MenuItem value="all">All Status</MenuItem>
                            <MenuItem value="active">Active</MenuItem>
                            <MenuItem value="inactive">Inactive</MenuItem>
                          </TextField>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>

                  {/* Users Table */}
                  {loadingUsers ? (
                    <Box>
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Skeleton key={i} variant="rounded" height={60} sx={{ mb: 1 }} />
                      ))}
                    </Box>
                  ) : users.length === 0 ? (
                    <Paper sx={{ p: 6, textAlign: 'center' }}>
                      <PeopleIcon sx={{ fontSize: 64, color: '#94a3b8', mb: 2 }} />
                      <Typography color="text.secondary">No users found</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        Click "Add User" to create your first user
                      </Typography>
                    </Paper>
                  ) : (
                    <>
                      <TableContainer component={Paper} variant="outlined">
                        <Table>
                          <TableHead>
                            <TableRow>
                              <TableCell>User</TableCell>
                              <TableCell>Email</TableCell>
                              <TableCell>Role</TableCell>
                              <TableCell>Phone</TableCell>
                              <TableCell>Status</TableCell>
                              <TableCell>Created</TableCell>
                              <TableCell align="right">Actions</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {users.map((userItem) => (
                              <TableRow key={userItem.id} hover>
                                <TableCell>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                    <Avatar
                                      sx={{
                                        width: 36,
                                        height: 36,
                                        bgcolor: getRoleColor(userItem.role),
                                        fontSize: '0.875rem',
                                      }}
                                    >
                                      {userItem.firstName[0]}
                                      {userItem.lastName[0]}
                                    </Avatar>
                                    <Box>
                                      <Typography variant="body2" fontWeight={500}>
                                        {userItem.firstName} {userItem.lastName}
                                      </Typography>
                                    </Box>
                                  </Box>
                                </TableCell>
                                <TableCell>
                                  <Typography variant="body2" color="text.secondary">
                                    {userItem.email}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Chip
                                    label={userItem.role}
                                    size="small"
                                    sx={{
                                      bgcolor: `${getRoleColor(userItem.role)}15`,
                                      color: getRoleColor(userItem.role),
                                      fontWeight: 600,
                                      fontSize: '0.75rem',
                                    }}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Typography variant="body2" color="text.secondary">
                                    {userItem.phone || 'N/A'}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <StatusBadge
                                    status={userItem.isActive ? 'active' : 'inactive'}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Typography variant="caption" color="text.secondary">
                                    {format(new Date(userItem.createdAt), 'PP')}
                                  </Typography>
                                </TableCell>
                                <TableCell align="right">
                                  <Tooltip title="Permissions">
                                    <IconButton
                                      size="small"
                                      color="primary"
                                      onClick={() => handleOpenPermissionDialog(userItem)}
                                      aria-label={`Manage permissions for ${userItem.firstName} ${userItem.lastName}`}
                                    >
                                      <SecurityIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Edit User">
                                    <IconButton
                                      size="small"
                                      onClick={() => handleOpenUserDialog(userItem)}
                                      aria-label={`Edit user ${userItem.firstName} ${userItem.lastName}`}
                                    >
                                      <EditIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                  {userItem.id !== user?.id && (
                                    <Tooltip title="Deactivate">
                                      <IconButton
                                        size="small"
                                        color="error"
                                        onClick={() => handleDeleteUser(userItem)}
                                        aria-label={`Deactivate user ${userItem.firstName} ${userItem.lastName}`}
                                      >
                                        <DeleteIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                      <TablePagination
                        component="div"
                        count={totalUsers}
                        page={page}
                        onPageChange={(_, newPage) => setPage(newPage)}
                        rowsPerPage={rowsPerPage}
                        onRowsPerPageChange={(e) => {
                          setRowsPerPage(parseInt(e.target.value, 10));
                          setPage(0);
                        }}
                        rowsPerPageOptions={[5, 10, 25, 50]}
                      />
                    </>
                  )}
                </TabPanel>
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Logo/Name Edit Dialog */}
      <Dialog open={logoDialogOpen} onClose={() => setLogoDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Customize Clinic Branding</Typography>
            <IconButton
              aria-label="close"
              onClick={() => setLogoDialogOpen(false)}
              sx={{ color: 'text.secondary' }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {/* Preview */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              p: 3,
              mb: 3,
              bgcolor: '#0f172a',
              borderRadius: 2,
            }}
          >
            <Box
              sx={{
                width: 50,
                height: 50,
                borderRadius: 2,
                background: 'linear-gradient(135deg, #0891b2 0%, #22d3ee 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: (logoPreview || customLogoUrl || tempLogo).startsWith('http') || (logoPreview || customLogoUrl || tempLogo).startsWith('/uploads/') || logoPreview ? '0' : '1.8rem',
                overflow: 'hidden',
              }}
            >
              {logoPreview ? (
                <img
                  src={logoPreview}
                  alt="Preview"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (customLogoUrl || tempLogo).startsWith('http') || (customLogoUrl || tempLogo).startsWith('/uploads/') ? (
                <img
                  src={(customLogoUrl || tempLogo).startsWith('/uploads/') 
                    ? `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${customLogoUrl || tempLogo}`
                    : (customLogoUrl || tempLogo)}
                  alt="Preview"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                tempLogo
              )}
            </Box>
            <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700 }}>
              {tempName}
            </Typography>
          </Box>

          {/* Clinic Name Input */}
          <TextField
            fullWidth
            label="Clinic Name"
            value={tempName}
            onChange={(e) => setTempName(e.target.value)}
            sx={{ mb: 3 }}
          />

          {/* Logo Upload Section */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
              Upload Logo Image
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
              <input
                ref={logoFileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoFileSelect}
                style={{ display: 'none' }}
                id="logo-file-input"
              />
              <label htmlFor="logo-file-input">
                <Button
                  variant="outlined"
                  component="span"
                  startIcon={<CloudUploadIcon />}
                  disabled={uploadingLogo}
                >
                  {uploadingLogo ? 'Uploading...' : 'Choose Image'}
                </Button>
              </label>
              {logoPreview && (
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteOutlineIcon />}
                  onClick={() => {
                    setLogoPreview(null);
                    if (logoFileInputRef.current) {
                      logoFileInputRef.current.value = '';
                    }
                  }}
                >
                  Clear
                </Button>
              )}
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Supported formats: JPG, PNG, GIF, WebP (max 5MB)
            </Typography>
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Logo URL Input (Alternative) */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
              Or Enter Logo URL
            </Typography>
            <TextField
              fullWidth
              label="Logo URL"
              value={customLogoUrl}
              onChange={(e) => {
                setCustomLogoUrl(e.target.value);
                if (e.target.value) {
                  setTempLogo(e.target.value);
                  setLogoPreview(null);
                }
              }}
              placeholder="https://example.com/logo.png"
              helperText="Enter image URL or upload file above"
            />
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Icon Selection */}
          <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
            Or Choose an Icon
          </Typography>
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 1,
              mb: 3,
              p: 2,
              bgcolor: '#f8fafc',
              borderRadius: 2,
              border: '1px solid #e2e8f0',
            }}
          >
            {LOGO_OPTIONS.map((emoji) => (
              <Box
                key={emoji}
                onClick={() => {
                  setTempLogo(emoji);
                  setCustomLogoUrl('');
                  setLogoPreview(null);
                  if (logoFileInputRef.current) {
                    logoFileInputRef.current.value = '';
                  }
                }}
                sx={{
                  width: 48,
                  height: 48,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem',
                  borderRadius: 2,
                  cursor: 'pointer',
                  border: tempLogo === emoji && !customLogoUrl
                    ? '2px solid #0891b2'
                    : '2px solid transparent',
                  bgcolor: tempLogo === emoji && !customLogoUrl ? '#0891b215' : 'transparent',
                  transition: 'all 0.2s',
                  '&:hover': {
                    bgcolor: '#e2e8f0',
                    transform: 'scale(1.1)',
                  },
                }}
              >
                {emoji}
              </Box>
            ))}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, gap: 1 }}>
          {clinicSettings.logo && (clinicSettings.logo.startsWith('/uploads/') || clinicSettings.logo.startsWith('http')) && (
            <Button
              color="error"
              startIcon={<DeleteOutlineIcon />}
              onClick={async () => {
                await handleRemoveLogo();
                setLogoDialogOpen(false);
              }}
            >
              Remove Logo
            </Button>
          )}
          <Box sx={{ flex: 1 }} />
          <Button onClick={() => {
            setLogoDialogOpen(false);
            setLogoPreview(null);
            if (logoFileInputRef.current) {
              logoFileInputRef.current.value = '';
            }
          }}>
            Cancel
          </Button>
          <Button 
            variant="contained" 
            onClick={handleSaveLogo}
            disabled={uploadingLogo}
            startIcon={uploadingLogo ? <CircularProgress size={16} /> : <SaveIcon />}
          >
            {uploadingLogo ? 'Uploading...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* User Dialog */}
      <Dialog
        open={userDialogOpen}
        onClose={handleCloseUserDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              {editingUser ? 'Edit User' : 'Create New User'}
            </Typography>
            <IconButton
              aria-label="close"
              onClick={handleCloseUserDialog}
              sx={{ color: 'text.secondary' }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <form onSubmit={userForm.handleSubmit(editingUser ? handleUpdateUser : handleCreateUser)}>
          <DialogContent dividers>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="First Name"
                  {...userForm.register('firstName', { required: 'First name is required' })}
                  error={!!userForm.formState.errors.firstName}
                  helperText={userForm.formState.errors.firstName?.message}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Last Name"
                  {...userForm.register('lastName', { required: 'Last name is required' })}
                  error={!!userForm.formState.errors.lastName}
                  helperText={userForm.formState.errors.lastName?.message}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Email Address"
                  type="email"
                  disabled={!!editingUser}
                  {...userForm.register('email', {
                    required: 'Email is required',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Invalid email address',
                    },
                  })}
                  error={!!userForm.formState.errors.email}
                  helperText={userForm.formState.errors.email?.message}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label={editingUser ? 'New Password (leave blank to keep current)' : 'Password'}
                  type="password"
                  {...userForm.register('password', {
                    required: !editingUser ? 'Password is required' : false,
                    minLength: {
                      value: 6,
                      message: 'Password must be at least 6 characters',
                    },
                  })}
                  error={!!userForm.formState.errors.password}
                  helperText={userForm.formState.errors.password?.message}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Phone Number"
                  {...userForm.register('phone')}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  fullWidth
                  label="Role"
                  {...userForm.register('role', { required: 'Role is required' })}
                  error={!!userForm.formState.errors.role}
                  helperText={userForm.formState.errors.role?.message}
                >
                  <MenuItem value="ADMIN">Admin</MenuItem>
                  <MenuItem value="DENTIST">Dentist</MenuItem>
                  <MenuItem value="RECEPTIONIST">Receptionist</MenuItem>
                  <MenuItem value="ASSISTANT">Assistant</MenuItem>
                </TextField>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 2.5, gap: 1 }}>
            <Button onClick={handleCloseUserDialog} disabled={submitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={submitting}
            >
              {submitting ? 'Saving...' : editingUser ? 'Update User' : 'Create User'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Delete User Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        title="Deactivate User"
        message={
          userToDelete
            ? `Are you sure you want to deactivate ${userToDelete.firstName} ${userToDelete.lastName}? This will prevent them from logging in.`
            : ''
        }
        confirmLabel="Deactivate"
        cancelLabel="Cancel"
        confirmColor="error"
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          setDeleteDialogOpen(false);
          setUserToDelete(null);
        }}
      />

      {/* Restore Confirmation Dialog */}
      <Dialog open={restoreDialogOpen} onClose={() => setRestoreDialogOpen(false)}>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Restore Backup</Typography>
            <IconButton
              aria-label="close"
              onClick={() => setRestoreDialogOpen(false)}
              sx={{ color: 'text.secondary' }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This is a destructive operation. Restoring from a backup may overwrite current data.
          </Alert>
          <Typography>
            Are you sure you want to restore from backup "{selectedBackup?.filename}"?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Created: {selectedBackup && format(new Date(selectedBackup.createdAt), 'PPpp')}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setRestoreDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="warning"
            onClick={handleRestoreConfirm}
            disabled={restoring}
          >
            {restoring ? 'Restoring...' : 'Restore'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Invoice Preview Dialog */}
      <Dialog
        open={previewDialogOpen}
        onClose={() => setPreviewDialogOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            maxHeight: '90vh',
          },
        }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" fontWeight={600}>
              Invoice Preview
            </Typography>
            <IconButton
              aria-label="close"
              onClick={() => setPreviewDialogOpen(false)}
              sx={{ color: 'text.secondary' }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers sx={{ overflowY: 'auto', p: 0 }}>
          {invoiceTemplate ? (
            <Box
              sx={{
                p: 3,
                '& iframe': {
                  width: '100%',
                  height: '70vh',
                  border: 'none',
                },
              }}
            >
              {previewHtml ? (
                <iframe
                  srcDoc={previewHtml}
                  title="Invoice Preview"
                />
              ) : (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                  <CircularProgress />
                </Box>
              )}
            </Box>
          ) : (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setPreviewDialogOpen(false)}>Close</Button>
          {previewHtml && (
            <Button
              variant="contained"
              onClick={() => {
                const printWindow = window.open('', '_blank');
                if (printWindow) {
                  printWindow.document.write(previewHtml);
                  printWindow.document.close();
                  printWindow.print();
                }
              }}
            >
              Print Preview
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Permission Management Dialog */}
      <Dialog
        open={permissionDialogOpen}
        onClose={() => {
          setPermissionDialogOpen(false);
          setSelectedUserForPermissions(null);
        }}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            maxHeight: '90vh',
          },
        }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="h6" fontWeight={600}>
                Manage Permissions
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {selectedUserForPermissions?.firstName} {selectedUserForPermissions?.lastName} ({selectedUserForPermissions?.role})
              </Typography>
            </Box>
            <IconButton
              aria-label="close"
              onClick={() => {
                setPermissionDialogOpen(false);
                setSelectedUserForPermissions(null);
              }}
              sx={{ color: 'text.secondary' }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers sx={{ overflowY: 'auto' }}>
          {loadingPermissions ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Grid container spacing={3}>
              {(['patients', 'appointments', 'treatments', 'invoices', 'payments', 'reports', 'users', 'settings'] as PermissionModule[]).map((module) => {
                const perm = getPermissionForModule(module);
                const moduleLabels: Record<PermissionModule, string> = {
                  patients: 'Patients',
                  appointments: 'Appointments',
                  treatments: 'Treatments',
                  invoices: 'Invoices',
                  payments: 'Payments',
                  reports: 'Reports',
                  users: 'Users',
                  settings: 'Settings',
                };

                return (
                  <Grid item xs={12} key={module}>
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                        {moduleLabels[module]}
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={6} sm={3}>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <input
                              type="checkbox"
                              checked={perm.canRead}
                              disabled
                              style={{ marginRight: 8, cursor: 'not-allowed' }}
                            />
                            <Typography variant="body2">Read (always enabled)</Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <input
                              type="checkbox"
                              checked={perm.canCreate}
                              onChange={(e) => handlePermissionChange(module, 'canCreate', e.target.checked)}
                              style={{ marginRight: 8, cursor: 'pointer' }}
                            />
                            <Typography variant="body2">Create</Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <input
                              type="checkbox"
                              checked={perm.canUpdate}
                              onChange={(e) => handlePermissionChange(module, 'canUpdate', e.target.checked)}
                              style={{ marginRight: 8, cursor: 'pointer' }}
                            />
                            <Typography variant="body2">Update</Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <input
                              type="checkbox"
                              checked={perm.canDelete}
                              onChange={(e) => handlePermissionChange(module, 'canDelete', e.target.checked)}
                              style={{ marginRight: 8, cursor: 'pointer' }}
                            />
                            <Typography variant="body2">Delete</Typography>
                          </Box>
                        </Grid>
                      </Grid>
                    </Paper>
                  </Grid>
                );
              })}
            </Grid>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleResetPermissions}
            disabled={submitting || loadingPermissions}
          >
            Reset to Role Defaults
          </Button>
          <Box sx={{ flex: 1 }} />
          <Button
            onClick={() => {
              setPermissionDialogOpen(false);
              setSelectedUserForPermissions(null);
            }}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSavePermissions}
            disabled={submitting || loadingPermissions}
          >
            {submitting ? 'Saving...' : 'Save Permissions'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Settings;
