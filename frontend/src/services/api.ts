import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import toast from 'react-hot-toast';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add auth token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle errors
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError<{ message?: string; errors?: Array<{ msg: string }> }>) => {
    const message = error.response?.data?.message 
      || error.response?.data?.errors?.[0]?.msg 
      || 'Something went wrong';

    // Handle 401 Unauthorized
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      toast.error('Session expired. Please login again.');
    } else if (error.response?.status !== 404) {
      // Don't show toast for 404s (handled by components)
      toast.error(message);
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  register: (data: { email: string; password: string; firstName: string; lastName: string; role?: string }) =>
    api.post('/auth/register', data),
  getMe: () => api.get('/auth/me'),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.put('/auth/change-password', { currentPassword, newPassword }),
};

// Users API
export const usersApi = {
  getAll: (params?: Record<string, string>) => api.get('/users', { params }),
  getDentists: () => api.get('/users/dentists'),
  getById: (id: string) => api.get(`/users/${id}`),
  create: (data: Record<string, unknown>) => api.post('/users', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/users/${id}`, data),
  delete: (id: string) => api.delete(`/users/${id}`),
  getPermissions: (id: string) => api.get(`/users/${id}/permissions`),
  updatePermissions: (id: string, permissions: Record<string, unknown>[]) =>
    api.put(`/users/${id}/permissions`, { permissions }),
  resetPermissions: (id: string) => api.post(`/users/${id}/permissions/reset`),
};

// Patients API
export const patientsApi = {
  getAll: (params?: Record<string, string>) => api.get('/patients', { params }),
  getById: (id: string) => api.get(`/patients/${id}`),
  create: (data: Record<string, unknown>) => api.post('/patients', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/patients/${id}`, data),
  delete: (id: string) => api.delete(`/patients/${id}`),
  updateMedicalHistory: (id: string, data: Record<string, unknown>) =>
    api.put(`/patients/${id}/medical-history`, data),
};

// Appointments API
export const appointmentsApi = {
  getAll: (params?: Record<string, string>) => api.get('/appointments', { params }),
  getCalendar: (startDate: string, endDate: string, dentistId?: string) =>
    api.get('/appointments/calendar', { params: { startDate, endDate, dentistId } }),
  getToday: (dentistId?: string) => api.get('/appointments/today', { params: { dentistId } }),
  getById: (id: string) => api.get(`/appointments/${id}`),
  create: (data: Record<string, unknown>) => api.post('/appointments', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/appointments/${id}`, data),
  updateStatus: (id: string, status: string) => api.put(`/appointments/${id}/status`, { status }),
  delete: (id: string) => api.delete(`/appointments/${id}`),
};

// Dental Charts API
export const dentalChartsApi = {
  getByPatient: (patientId: string) => api.get(`/dental-charts/patient/${patientId}`),
  getHistory: (patientId: string) => api.get(`/dental-charts/patient/${patientId}/history`),
  getById: (id: string) => api.get(`/dental-charts/${id}`),
  save: (data: { patientId: string; chartData: Record<string, unknown>; notes?: string }) =>
    api.post('/dental-charts', data),
  updateTooth: (id: string, data: Record<string, unknown>) =>
    api.put(`/dental-charts/${id}/tooth`, data),
};

// Diseases API
export const diseasesApi = {
  getAll: (params?: Record<string, string>) => api.get('/diseases', { params }),
  getCategories: () => api.get('/diseases/categories'),
  getById: (id: string) => api.get(`/diseases/${id}`),
  create: (data: Record<string, unknown>) => api.post('/diseases', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/diseases/${id}`, data),
  // Diagnoses
  getDiagnosesByPatient: (patientId: string) => api.get(`/diseases/diagnoses/patient/${patientId}`),
  createDiagnosis: (data: Record<string, unknown>) => api.post('/diseases/diagnoses', data),
  updateDiagnosis: (id: string, data: Record<string, unknown>) =>
    api.put(`/diseases/diagnoses/${id}`, data),
  deleteDiagnosis: (id: string) => api.delete(`/diseases/diagnoses/${id}`),
};

// Procedure Types API
export const procedureTypesApi = {
  getAll: (params?: Record<string, string>) => api.get('/procedure-types', { params }),
  getCategories: () => api.get('/procedure-types/categories'),
  getById: (id: string) => api.get(`/procedure-types/${id}`),
  create: (data: Record<string, unknown>) => api.post('/procedure-types', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/procedure-types/${id}`, data),
  delete: (id: string) => api.delete(`/procedure-types/${id}`),
};

// Treatments API
export const treatmentsApi = {
  getAll: (params?: Record<string, string>) => api.get('/treatments', { params }),
  getByPatient: (patientId: string) => api.get(`/treatments/patient/${patientId}`),
  getById: (id: string) => api.get(`/treatments/${id}`),
  create: (data: Record<string, unknown>) => api.post('/treatments', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/treatments/${id}`, data),
  updateStatus: (id: string, status: string) => api.put(`/treatments/${id}/status`, { status }),
  // Procedures
  addProcedure: (treatmentId: string, data: Record<string, unknown>) =>
    api.post(`/treatments/${treatmentId}/procedures`, data),
  updateProcedure: (procedureId: string, data: Record<string, unknown>) =>
    api.put(`/treatments/procedures/${procedureId}`, data),
  deleteProcedure: (procedureId: string) => api.delete(`/treatments/procedures/${procedureId}`),
  delete: (id: string) => api.delete(`/treatments/${id}`),
};

// Invoices API
export const invoicesApi = {
  getAll: (params?: Record<string, string>) => api.get('/invoices', { params }),
  getOutstanding: () => api.get('/invoices/outstanding'),
  getByPatient: (patientId: string) => api.get(`/invoices/patient/${patientId}`),
  getById: (id: string) => api.get(`/invoices/${id}`),
  exportToPDF: (id: string, params?: string) => 
    api.get(`/invoices/${id}/pdf${params ? `?${params}` : ''}`, { responseType: 'blob' }),
  create: (data: Record<string, unknown>) => api.post('/invoices', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/invoices/${id}`, data),
  addItem: (id: string, data: Record<string, unknown>) => api.post(`/invoices/${id}/items`, data),
  delete: (id: string) => api.delete(`/invoices/${id}`),
};

// Payments API
export const paymentsApi = {
  getAll: (params?: Record<string, string>) => api.get('/payments', { params }),
  getToday: () => api.get('/payments/today'),
  getById: (id: string) => api.get(`/payments/${id}`),
  create: (data: Record<string, unknown>) => api.post('/payments', data),
  delete: (id: string) => api.delete(`/payments/${id}`),
};

// Reports API
export const reportsApi = {
  getDashboard: () => api.get('/reports/dashboard'),
  getRevenue: (params?: Record<string, string>) => api.get('/reports/revenue', { params }),
  getTreatments: (params?: Record<string, string>) => api.get('/reports/treatments', { params }),
  getPatients: (params?: Record<string, string>) => api.get('/reports/patients', { params }),
  getAppointments: (params?: Record<string, string>) => api.get('/reports/appointments', { params }),
  getDentistPerformance: (params?: Record<string, string>) =>
    api.get('/reports/dentist-performance', { params }),
  getDoctorPatientCount: (date?: string) =>
    api.get('/reports/doctor-patient-count', { params: date ? { date } : {} }),
};

// Documents API
export const documentsApi = {
  getByPatient: (patientId: string, type?: string) =>
    api.get(`/documents/patient/${patientId}`, { params: { type } }),
  getById: (id: string) => api.get(`/documents/${id}`),
  download: (id: string) => api.get(`/documents/${id}/download`, { responseType: 'blob' }),
  upload: (formData: FormData) =>
    api.post('/documents', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  update: (id: string, data: Record<string, unknown>) => api.put(`/documents/${id}`, data),
  delete: (id: string) => api.delete(`/documents/${id}`),
};

// Backup API
export const backupApi = {
  list: () => api.get('/backup/list'),
  create: () => api.post('/backup/create'),
  download: (id: string) => api.get(`/backup/download/${id}`, { responseType: 'blob' }),
  restore: (id: string) => api.post(`/backup/restore/${id}`),
  delete: (id: string) => api.delete(`/backup/${id}`),
};

// Patient Export API
export const patientExportApi = {
  exportToPDF: (patientId: string) => api.get(`/patients/${patientId}/export`, { responseType: 'blob' }),
};

// Reports Export API
export const reportsExportApi = {
  exportToExcel: (type?: string, startDate?: string, endDate?: string) => 
    api.get('/reports/export', { 
      params: { type, startDate, endDate },
      responseType: 'blob' 
    }),
};

// Logs API
export const logsApi = {
  list: () => api.get('/logs/list'),
  getFile: (filename: string, lines?: number, search?: string) => 
    api.get(`/logs/${filename}`, { params: { lines, search } }),
  download: (filename: string) => 
    api.get(`/logs/download/${filename}`, { responseType: 'blob' }),
  delete: (filename: string) => api.delete(`/logs/${filename}`),
  clear: (olderThanDays?: number) => api.post('/logs/clear', { olderThanDays }),
  getStats: () => api.get('/logs/stats/summary'),
};

// Invoice Templates API
export const invoiceTemplatesApi = {
  getAll: () => api.get('/invoice-templates'),
  getDefault: () => api.get('/invoice-templates/default'),
  getById: (id: string) => api.get(`/invoice-templates/${id}`),
  create: (data: Record<string, unknown>) => api.post('/invoice-templates', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/invoice-templates/${id}`, data),
  setDefault: (id: string) => api.put(`/invoice-templates/${id}/set-default`),
  delete: (id: string) => api.delete(`/invoice-templates/${id}`),
};

// Settings API
export const settingsApi = {
  uploadLogo: (file: File) => {
    const formData = new FormData();
    formData.append('logo', file);
    return api.post('/settings/logo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  deleteLogo: (logoPath: string) => api.delete('/settings/logo', { data: { logoPath } }),
};

export default api;


