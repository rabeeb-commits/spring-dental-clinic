import { UserRole, Gender, AppointmentType, AppointmentStatus, TreatmentStatus, PaymentMode, InvoiceStatus, DocumentType } from '@prisma/client';

// Re-export Prisma enums
export {
  UserRole,
  Gender,
  AppointmentType,
  AppointmentStatus,
  TreatmentStatus,
  PaymentMode,
  InvoiceStatus,
  DocumentType,
};

// ToothStatus is not used in Prisma models, so we define it manually
export enum ToothStatus {
  HEALTHY = 'HEALTHY',
  CARIES = 'CARIES',
  MISSING = 'MISSING',
  RESTORED = 'RESTORED',
  CROWNED = 'CROWNED',
  ROOT_CANAL = 'ROOT_CANAL',
  EXTRACTED = 'EXTRACTED',
  IMPACTED = 'IMPACTED',
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Auth types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role?: UserRole;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
  };
  token: string;
}

// Patient types
export interface CreatePatientRequest {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
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
  notes?: string;
}

// Medical History types
export interface UpdateMedicalHistoryRequest {
  allergies?: string[];
  chronicDiseases?: string[];
  currentMedications?: string[];
  previousSurgeries?: string[];
  familyHistory?: string;
  smokingStatus?: string;
  alcoholConsumption?: string;
  pregnancyStatus?: string;
}

// Dental Chart types
export interface ToothData {
  number: number; // FDI tooth number (11-48)
  status: ToothStatus;
  notes?: string;
  treatments?: string[];
  diseases?: string[];
}

export interface DentalChartData {
  teeth: Record<number, ToothData>;
  notes?: string;
}

export interface CreateDentalChartRequest {
  patientId: string;
  chartData: DentalChartData;
  notes?: string;
}

// Appointment types
export interface CreateAppointmentRequest {
  patientId: string;
  dentistId: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  type?: AppointmentType;
  reason?: string;
  notes?: string;
  toothNumbers?: number[]; // FDI tooth numbers (11-48)
}

// Treatment types
export interface CreateTreatmentRequest {
  patientId: string;
  dentistId: string;
  title: string;
  description?: string;
  startDate?: string;
  notes?: string;
  procedures?: CreateTreatmentProcedureRequest[];
}

export interface CreateTreatmentProcedureRequest {
  procedureTypeId: string;
  toothNumbers?: number[];
  cost?: number;
  scheduledDate?: string;
  notes?: string;
}

// Invoice types
export interface CreateInvoiceRequest {
  patientId: string;
  treatmentId?: string;
  items: CreateInvoiceItemRequest[];
  discount?: number;
  tax?: number;
  dueDate?: string;
  notes?: string;
}

export interface CreateInvoiceItemRequest {
  description: string;
  toothNumbers?: number[];
  quantity?: number;
  unitPrice: number;
}

// Payment types
export interface CreatePaymentRequest {
  invoiceId: string;
  amount: number;
  paymentMode: PaymentMode;
  transactionId?: string;
  notes?: string;
}

// Disease/Diagnosis types
export interface CreateDiseaseRequest {
  name: string;
  code?: string;
  description?: string;
  category?: string;
}

export interface CreateDiagnosisRequest {
  patientId: string;
  diseaseId: string;
  toothNumbers?: number[];
  severity?: string;
  notes?: string;
}

// Document types
export interface CreateDocumentRequest {
  patientId: string;
  type: DocumentType;
  title: string;
  description?: string;
  toothNumbers?: number[];
}

// Query params types
export interface PaginationQuery {
  page?: string;
  limit?: string;
}

export interface PatientSearchQuery extends PaginationQuery {
  search?: string;
  gender?: Gender;
  isActive?: string;
}

export interface AppointmentSearchQuery extends PaginationQuery {
  patientId?: string;
  dentistId?: string;
  status?: AppointmentStatus;
  type?: AppointmentType;
  startDate?: string;
  endDate?: string;
}

export interface TreatmentSearchQuery extends PaginationQuery {
  patientId?: string;
  dentistId?: string;
  status?: TreatmentStatus;
}

export interface InvoiceSearchQuery extends PaginationQuery {
  patientId?: string;
  status?: InvoiceStatus;
  startDate?: string;
  endDate?: string;
}

// Report types
export interface RevenueReport {
  totalRevenue: number;
  totalPaid: number;
  totalPending: number;
  byPaymentMode: Record<PaymentMode, number>;
  byMonth: { month: string; amount: number }[];
}

export interface TreatmentReport {
  totalTreatments: number;
  byStatus: Record<TreatmentStatus, number>;
  byProcedure: { procedure: string; count: number }[];
}

export interface PatientReport {
  totalPatients: number;
  newPatientsThisMonth: number;
  byGender: Record<Gender, number>;
  topVisitors: { patient: string; visits: number }[];
}


