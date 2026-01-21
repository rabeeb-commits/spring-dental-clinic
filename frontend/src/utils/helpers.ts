/**
 * Calculate age from date of birth
 */
export const calculateAge = (dateOfBirth: string | Date): number => {
  const birthDate = typeof dateOfBirth === 'string' ? new Date(dateOfBirth) : dateOfBirth;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
};

/**
 * Format currency
 */
export const formatCurrency = (amount: number, currency: string = 'INR'): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
};

/**
 * Format date
 */
export const formatDate = (date: string | Date, format: string = 'dd MMM yyyy'): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(dateObj);
};

/**
 * Get initials from name
 */
export const getInitials = (firstName: string, lastName: string): string => {
  return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
};

/**
 * Format time in 12-hour format with AM/PM
 * Accepts Date object or time string (HH:MM format)
 * Returns: "h:mm AM/PM" format (e.g., "1:00 PM", "12:00 AM")
 */
export const formatTime12Hour = (time: Date | string): string => {
  let date: Date;
  
  if (typeof time === 'string') {
    // Parse 24-hour format string (HH:MM)
    const [hours, minutes] = time.split(':').map(Number);
    date = new Date();
    date.setHours(hours, minutes, 0, 0);
  } else {
    date = time;
  }
  
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
};

/**
 * Parse time string (12-hour or 24-hour format) to Date object
 * Accepts: "h:mm AM/PM" or "HH:MM" format
 * Returns: Date object with today's date and the specified time
 */
export const parseTime12Hour = (timeStr: string): Date => {
  const cleaned = timeStr.trim().toUpperCase();
  
  // Check if it's 12-hour format (h:mm AM/PM)
  const match12Hour = cleaned.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
  if (match12Hour) {
    let hours = parseInt(match12Hour[1], 10);
    const minutes = parseInt(match12Hour[2], 10);
    const period = match12Hour[3];
    
    if (period === 'AM') {
      if (hours === 12) {
        hours = 0; // 12:00 AM = 00:00
      }
    } else if (period === 'PM') {
      if (hours !== 12) {
        hours += 12; // 1:00 PM = 13:00, but 12:00 PM = 12:00
      }
    }
    
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  }
  
  // Check if it's 24-hour format (HH:MM)
  const match24Hour = cleaned.match(/^([01]?[0-9]|2[0-3]):([0-5][0-9])$/);
  if (match24Hour) {
    const hours = parseInt(match24Hour[1], 10);
    const minutes = parseInt(match24Hour[2], 10);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  }
  
  throw new Error(`Invalid time format: ${timeStr}. Expected "h:mm AM/PM" or "HH:MM"`);
};
