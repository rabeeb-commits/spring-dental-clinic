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

/**
 * Convert 12-hour format time to 24-hour format
 * Examples: "1:00 PM" -> "13:00", "12:00 AM" -> "00:00", "12:00 PM" -> "12:00"
 */
export const convertTo24Hour = (time12Hour: string): string => {
  // Remove extra spaces and convert to uppercase
  const cleaned = time12Hour.trim().toUpperCase();
  
  // Check if already in 24-hour format (HH:MM)
  const is24Hour = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(cleaned);
  if (is24Hour) {
    return cleaned;
  }
  
  // Parse 12-hour format (h:mm AM/PM or hh:mm AM/PM)
  const match = cleaned.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
  if (!match) {
    throw new Error(`Invalid time format: ${time12Hour}. Expected format: "h:mm AM/PM" or "HH:MM"`);
  }
  
  let hours = parseInt(match[1], 10);
  const minutes = match[2];
  const period = match[3];
  
  if (period === 'AM') {
    if (hours === 12) {
      hours = 0; // 12:00 AM = 00:00
    }
  } else if (period === 'PM') {
    if (hours !== 12) {
      hours += 12; // 1:00 PM = 13:00, but 12:00 PM = 12:00
    }
  }
  
  return `${hours.toString().padStart(2, '0')}:${minutes}`;
};

/**
 * Convert 24-hour format time to 12-hour format
 * Examples: "13:00" -> "1:00 PM", "00:00" -> "12:00 AM", "12:00" -> "12:00 PM"
 */
export const convertTo12Hour = (time24Hour: string): string => {
  // Check if already in 12-hour format
  if (/^\d{1,2}:\d{2}\s*(AM|PM)$/i.test(time24Hour.trim())) {
    return time24Hour.trim();
  }
  
  // Parse 24-hour format
  const match = time24Hour.match(/^([01]?[0-9]|2[0-3]):([0-5][0-9])$/);
  if (!match) {
    throw new Error(`Invalid time format: ${time24Hour}. Expected format: "HH:MM"`);
  }
  
  let hours = parseInt(match[1], 10);
  const minutes = match[2];
  const period = hours >= 12 ? 'PM' : 'AM';
  
  if (hours === 0) {
    hours = 12; // 00:00 = 12:00 AM
  } else if (hours > 12) {
    hours -= 12; // 13:00 = 1:00 PM
  }
  // hours === 12 stays as 12 (12:00 PM)
  
  return `${hours}:${minutes} ${period}`;
};

/**
 * Compare two time strings (24-hour format)
 * Returns: -1 if time1 < time2, 0 if equal, 1 if time1 > time2
 */
export const compareTimes = (time1: string, time2: string): number => {
  const [h1, m1] = time1.split(':').map(Number);
  const [h2, m2] = time2.split(':').map(Number);
  
  const totalMinutes1 = h1 * 60 + m1;
  const totalMinutes2 = h2 * 60 + m2;
  
  if (totalMinutes1 < totalMinutes2) return -1;
  if (totalMinutes1 > totalMinutes2) return 1;
  return 0;
};



