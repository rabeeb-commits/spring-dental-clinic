import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Generate a unique patient ID in format PAT-YYYY-XXXX
 */
export const generatePatientId = async (): Promise<string> => {
  const year = new Date().getFullYear();
  const prefix = `PAT-${year}-`;
  
  // Get the last patient ID for this year
  const lastPatient = await prisma.patient.findFirst({
    where: {
      patientId: {
        startsWith: prefix,
      },
    },
    orderBy: {
      patientId: 'desc',
    },
  });

  let nextNumber = 1;
  if (lastPatient) {
    const lastNumber = parseInt(lastPatient.patientId.split('-')[2], 10);
    nextNumber = lastNumber + 1;
  }

  return `${prefix}${nextNumber.toString().padStart(4, '0')}`;
};

/**
 * Generate a unique invoice number in format INV-YYYY-XXXX
 */
export const generateInvoiceNumber = async (): Promise<string> => {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;
  
  const lastInvoice = await prisma.invoice.findFirst({
    where: {
      invoiceNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      invoiceNumber: 'desc',
    },
  });

  let nextNumber = 1;
  if (lastInvoice) {
    const lastNumber = parseInt(lastInvoice.invoiceNumber.split('-')[2], 10);
    nextNumber = lastNumber + 1;
  }

  return `${prefix}${nextNumber.toString().padStart(4, '0')}`;
};

/**
 * Parse pagination query params
 */
export const parsePagination = (page?: string, limit?: string) => {
  const pageNum = Math.max(1, parseInt(page || '1', 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit || '10', 10)));
  const skip = (pageNum - 1) * limitNum;
  
  return { page: pageNum, limit: limitNum, skip };
};

/**
 * Calculate pagination meta
 */
export const getPaginationMeta = (total: number, page: number, limit: number) => {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
};

/**
 * FDI tooth numbering validation (11-18, 21-28, 31-38, 41-48)
 */
export const isValidToothNumber = (num: number): boolean => {
  const quadrant = Math.floor(num / 10);
  const tooth = num % 10;
  return [1, 2, 3, 4].includes(quadrant) && tooth >= 1 && tooth <= 8;
};

/**
 * Get all valid FDI tooth numbers
 */
export const getAllToothNumbers = (): number[] => {
  const teeth: number[] = [];
  for (const quadrant of [1, 2, 3, 4]) {
    for (let tooth = 1; tooth <= 8; tooth++) {
      teeth.push(quadrant * 10 + tooth);
    }
  }
  return teeth;
};

/**
 * Format date for display
 */
export const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

/**
 * Format currency
 */
export const formatCurrency = (amount: number, currency = 'INR'): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
  }).format(amount);
};

/**
 * Calculate age from date of birth
 */
export const calculateAge = (dateOfBirth: Date): number => {
  const today = new Date();
  let age = today.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = today.getMonth() - dateOfBirth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
    age--;
  }
  
  return age;
};

/**
 * Sanitize search query
 */
export const sanitizeSearchQuery = (query: string): string => {
  return query.trim().replace(/[%_]/g, '\\$&');
};



