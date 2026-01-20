// User types
export type UserRole = 'ADMIN' | 'DENTIST' | 'RECEPTIONIST' | 'ASSISTANT';

export type PermissionModule =
  | 'patients'
  | 'appointments'
  | 'treatments'
  | 'invoices'
  | 'payments'
  | 'reports'
  | 'users'
  | 'settings';

export interface Permission {
  module: PermissionModule;
  canCreate: boolean;
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

// Patient types
export type Gender = 'MALE' | 'FEMALE' | 'OTHER';

export interface Patient {
  id: string;
  patientId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  age?: number;
  gender: Gender;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  bloodGroup?: string;
  profileImage?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
  medicalHistory?: MedicalHistory;
  _count?: {
    appointments: number;
    treatments: number;
  };
}

export interface MedicalHistory {
  id: string;
  patientId: string;
  allergies: string[];
  chronicDiseases: string[];
  currentMedications: string[];
  previousSurgeries: string[];
  familyHistory?: string;
  smokingStatus?: string;
  alcoholConsumption?: string;
  pregnancyStatus?: string;
  lastUpdated: string;
}

// Appointment types
export type AppointmentType = 'CONSULTATION' | 'FOLLOW_UP' | 'EMERGENCY' | 'PROCEDURE';
export type AppointmentStatus = 'CONFIRMED' | 'RESCHEDULED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';

export interface Appointment {
  id: string;
  patientId: string;
  dentistId: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  type: AppointmentType;
  status: AppointmentStatus;
  reason?: string;
  notes?: string;
  toothNumbers?: number[]; // FDI tooth numbers (11-48)
  createdAt: string;
  patient?: Pick<Patient, 'id' | 'patientId' | 'firstName' | 'lastName' | 'phone'>;
  dentist?: Pick<User, 'id' | 'firstName' | 'lastName'>;
}

// Dental Chart types
export type ToothStatus = 'HEALTHY' | 'CARIES' | 'MISSING' | 'RESTORED' | 'CROWNED' | 'ROOT_CANAL' | 'EXTRACTED' | 'IMPACTED';

export interface ToothData {
  number: number;
  status: ToothStatus;
  notes?: string;
  treatments?: string[];
  diseases?: string[];
}

export interface DentalChartData {
  teeth: Record<number, ToothData>;
  notes?: string;
}

export interface DentalChart {
  id: string;
  patientId: string;
  chartData: DentalChartData;
  version: number;
  notes?: string;
  createdById: string;
  createdAt: string;
  createdBy?: Pick<User, 'id' | 'firstName' | 'lastName'>;
}

// Disease types
export interface Disease {
  id: string;
  name: string;
  code?: string;
  description?: string;
  category?: string;
  isActive: boolean;
}

export interface Diagnosis {
  id: string;
  patientId: string;
  diseaseId: string;
  toothNumbers: number[];
  severity?: string;
  notes?: string;
  diagnosedById: string;
  diagnosedAt: string;
  disease?: Disease;
  diagnosedBy?: Pick<User, 'id' | 'firstName' | 'lastName'>;
}

// Treatment types
export type TreatmentStatus = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface ProcedureType {
  id: string;
  name: string;
  code?: string;
  description?: string;
  defaultCost: number;
  duration?: number;
  category?: string;
  isActive: boolean;
}

export interface TreatmentProcedure {
  id: string;
  treatmentId: string;
  procedureTypeId: string;
  toothNumbers: number[];
  status: TreatmentStatus;
  cost: number;
  notes?: string;
  scheduledDate?: string;
  completedDate?: string;
  procedureType?: ProcedureType;
}

export interface Treatment {
  id: string;
  patientId: string;
  dentistId: string;
  title: string;
  description?: string;
  status: TreatmentStatus;
  totalCost: number;
  startDate?: string;
  endDate?: string;
  notes?: string;
  createdAt: string;
  patient?: Pick<Patient, 'id' | 'patientId' | 'firstName' | 'lastName'>;
  dentist?: Pick<User, 'id' | 'firstName' | 'lastName'>;
  procedures?: TreatmentProcedure[];
  invoice?: Pick<Invoice, 'id' | 'invoiceNumber' | 'status' | 'totalAmount' | 'paidAmount'>;
}

// Invoice types
export type PaymentMode = 'CASH' | 'UPI' | 'CARD' | 'ONLINE_WALLET' | 'INSURANCE' | 'BANK_TRANSFER';
export type InvoiceStatus = 'DRAFT' | 'PENDING' | 'PARTIAL' | 'PAID' | 'CANCELLED' | 'REFUNDED';

export interface InvoiceItem {
  id: string;
  invoiceId: string;
  description: string;
  toothNumbers: number[];
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface Payment {
  id: string;
  invoiceId: string;
  amount: number;
  paymentMode: PaymentMode;
  transactionId?: string;
  notes?: string;
  receivedById: string;
  paymentDate: string;
  receivedBy?: Pick<User, 'id' | 'firstName' | 'lastName'>;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  patientId: string;
  treatmentId?: string;
  subtotal: number;
  discount: number;
  tax: number;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  status: InvoiceStatus;
  dueDate?: string;
  notes?: string;
  createdById: string;
  createdAt: string;
  patient?: Pick<Patient, 'id' | 'patientId' | 'firstName' | 'lastName' | 'phone' | 'email' | 'address'>;
  treatment?: Pick<Treatment, 'id' | 'title'>;
  items?: InvoiceItem[];
  payments?: Payment[];
  createdBy?: Pick<User, 'id' | 'firstName' | 'lastName'>;
}

// Document types
export type DocumentType = 'XRAY' | 'SCAN' | 'PRESCRIPTION' | 'CONSENT_FORM' | 'LAB_REPORT' | 'OTHER';

export interface Document {
  id: string;
  patientId: string;
  type: DocumentType;
  title: string;
  description?: string;
  fileName: string;
  filePath: string;
  fileSize?: number;
  mimeType?: string;
  toothNumbers: number[];
  uploadedById: string;
  uploadedAt: string;
  uploadedBy?: Pick<User, 'id' | 'firstName' | 'lastName'>;
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  meta?: PaginationMeta;
  errors?: Array<{ msg: string; path: string }>;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Dashboard types
export interface DashboardData {
  patients: {
    total: number;
    newThisMonth: number;
  };
  appointments: {
    today: number;
    pending: number;
  };
  revenue: {
    thisMonth: number;
    today: number;
    outstanding: number;
  };
  treatments: {
    inProgress: number;
  };
}

// Auth types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

// Invoice Template types
export interface InvoiceTemplate {
  id: string;
  name: string;
  isDefault: boolean;
  logoPosition: 'left' | 'center' | 'right';
  showClinicName: boolean;
  showAddress: boolean;
  showContact: boolean;
  templateStyle: 'classic' | 'modern' | 'minimal';
  itemTableStyle: 'bordered' | 'striped' | 'minimal';
  totalsPosition: 'left' | 'right' | 'center';
  paymentTerms?: string;
  showDueDate: boolean;
  showPaymentMethods: boolean;
  lateFeeEnabled: boolean;
  lateFeePercent?: number;
  lateFeeDays?: number;
  taxLabel: string;
  taxType: 'percentage' | 'fixed';
  showTaxBreakdown: boolean;
  taxId?: string;
  footerText?: string;
  showSignature: boolean;
  signatureLabel?: string;
  primaryColor: string;
  headerBgColor?: string;
  footerBgColor?: string;
  fontFamily: string;
  createdAt: string;
  updatedAt: string;
}



