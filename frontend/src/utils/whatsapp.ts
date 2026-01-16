/**
 * WhatsApp utility functions for opening WhatsApp Web/App with pre-filled messages
 */

/**
 * Formats a phone number for WhatsApp
 * - Removes all non-numeric characters
 * - Ensures country code is present (defaults to +91 for India if missing)
 * @param phone - Phone number string (can include spaces, dashes, parentheses, etc.)
 * @param defaultCountryCode - Default country code to use if missing (default: '91' for India)
 * @returns Formatted phone number with country code
 */
export function formatPhoneNumber(phone: string, defaultCountryCode: string = '91'): string {
  if (!phone) return '';
  
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');
  
  if (!cleaned) return '';
  
  // If it starts with country code (assuming 91 for India), return as is
  // Otherwise, add default country code
  if (cleaned.length >= 10) {
    // Check if it already has country code
    if (cleaned.length === 10) {
      return `${defaultCountryCode}${cleaned}`;
    }
    // If it has country code but no +, return as is
    return cleaned;
  }
  
  return cleaned;
}

/**
 * Generates an appointment reminder message template
 */
export function generateAppointmentMessage(data: {
  patientName: string;
  date: string;
  startTime: string;
  endTime: string;
  dentistName: string;
  type: string;
  reason?: string;
}): string {
  const { patientName, date, startTime, endTime, dentistName, type, reason } = data;
  
  let message = `Hello ${patientName},\n\n`;
  message += `Your appointment is scheduled:\n`;
  message += `📅 Date: ${date}\n`;
  message += `⏰ Time: ${startTime} - ${endTime}\n`;
  message += `👨‍⚕️ Dentist: Dr. ${dentistName}\n`;
  message += `📋 Type: ${type.replace('_', ' ')}\n`;
  
  if (reason) {
    message += `\nReason: ${reason}\n`;
  }
  
  message += `\nPlease arrive 10 minutes early.\n`;
  message += `See you soon!`;
  
  return message;
}

/**
 * Generates a follow-up reminder message
 */
export function generateFollowUpMessage(patientName: string): string {
  return `Hello ${patientName},\n\nThis is a follow-up reminder from your dental clinic. Please contact us to schedule your next appointment.\n\nThank you!`;
}

/**
 * Generates a payment reminder message
 */
export function generatePaymentReminderMessage(data: {
  patientName: string;
  amount: number;
  invoiceNumber?: string;
}): string {
  const { patientName, amount, invoiceNumber } = data;
  const formattedAmount = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
  
  let message = `Hello ${patientName},\n\n`;
  message += `This is a payment reminder.\n`;
  message += `Outstanding Amount: ${formattedAmount}\n`;
  
  if (invoiceNumber) {
    message += `Invoice Number: ${invoiceNumber}\n`;
  }
  
  message += `\nPlease make the payment at your earliest convenience.\n`;
  message += `Thank you!`;
  
  return message;
}

/**
 * Opens WhatsApp Web/App with pre-filled phone number and message
 * @param phone - Patient phone number
 * @param message - Message to pre-fill
 * @param copyToClipboard - Whether to copy message to clipboard as backup (default: true)
 */
export function openWhatsApp(
  phone: string,
  message: string,
  copyToClipboard: boolean = true
): void {
  if (!phone) {
    console.error('Phone number is required');
    return;
  }
  
  // Format phone number
  const formattedPhone = formatPhoneNumber(phone);
  
  if (!formattedPhone) {
    console.error('Invalid phone number');
    return;
  }
  
  // URL encode the message
  const encodedMessage = encodeURIComponent(message);
  
  // Create WhatsApp URL
  const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
  
  // Copy message to clipboard as backup
  if (copyToClipboard && navigator.clipboard) {
    navigator.clipboard.writeText(message).catch(() => {
      // Silently fail - not critical
    });
  }
  
  // Open WhatsApp in new tab/window
  const whatsappWindow = window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  
  // Check if popup was blocked
  if (!whatsappWindow || whatsappWindow.closed || typeof whatsappWindow.closed === 'undefined') {
    // Popup blocked - show user-friendly message
    alert('Please allow popups for this site to open WhatsApp. Alternatively, you can copy the phone number and message manually.');
  }
}

/**
 * Opens WhatsApp with appointment reminder message
 */
export function sendAppointmentReminder(data: {
  phone: string;
  patientName: string;
  date: string;
  startTime: string;
  endTime: string;
  dentistName: string;
  type: string;
  reason?: string;
}): void {
  const message = generateAppointmentMessage(data);
  openWhatsApp(data.phone, message);
}

/**
 * Opens WhatsApp with follow-up message
 */
export function sendFollowUpReminder(phone: string, patientName: string): void {
  const message = generateFollowUpMessage(patientName);
  openWhatsApp(phone, message);
}

/**
 * Opens WhatsApp with payment reminder message
 */
export function sendPaymentReminder(data: {
  phone: string;
  patientName: string;
  amount: number;
  invoiceNumber?: string;
}): void {
  const message = generatePaymentReminderMessage(data);
  openWhatsApp(data.phone, message);
}
