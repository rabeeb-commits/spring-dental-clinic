/**
 * Email validation regex
 */
export const EMAIL_REGEX = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;

/**
 * Phone number validation (10 digits)
 */
export const PHONE_REGEX = /^[0-9]{10}$/;

/**
 * Validate email address
 */
export const validateEmail = (email: string): boolean => {
  return EMAIL_REGEX.test(email);
};

/**
 * Validate phone number (10 digits)
 */
export const validatePhone = (phone: string): boolean => {
  return PHONE_REGEX.test(phone.replace(/\D/g, ''));
};

/**
 * Validate required field
 */
export const validateRequired = (value: string | null | undefined): boolean => {
  return value !== null && value !== undefined && value.trim() !== '';
};

/**
 * Validate minimum length
 */
export const validateMinLength = (value: string, minLength: number): boolean => {
  return value.length >= minLength;
};

/**
 * Validate maximum length
 */
export const validateMaxLength = (value: string, maxLength: number): boolean => {
  return value.length <= maxLength;
};

/**
 * Validate date is in the past
 */
export const validatePastDate = (date: Date | string): boolean => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj < new Date();
};

/**
 * Validate date is in the future
 */
export const validateFutureDate = (date: Date | string): boolean => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj > new Date();
};

/**
 * Validate age is within range
 */
export const validateAgeRange = (dateOfBirth: Date | string, minAge: number, maxAge: number): boolean => {
  const birthDate = typeof dateOfBirth === 'string' ? new Date(dateOfBirth) : dateOfBirth;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age >= minAge && age <= maxAge;
};

/**
 * Validate numeric value
 */
export const validateNumeric = (value: string | number): boolean => {
  return !isNaN(Number(value));
};

/**
 * Validate positive number
 */
export const validatePositive = (value: number): boolean => {
  return value > 0;
};

/**
 * Validate non-negative number
 */
export const validateNonNegative = (value: number): boolean => {
  return value >= 0;
};
