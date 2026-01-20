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

/**
 * Generates an invoice message for WhatsApp
 */
export function generateInvoiceMessage(data: {
  invoice: {
    invoiceNumber: string;
    createdAt: string;
    dueDate?: string;
    subtotal: number;
    discount: number;
    tax: number;
    totalAmount: number;
    paidAmount: number;
    dueAmount: number;
    items?: Array<{
      description: string;
      quantity: number;
      unitPrice: number;
      amount: number;
    }>;
    notes?: string;
  };
  patient: {
    firstName: string;
    lastName: string;
  };
  clinicSettings: {
    name: string;
    phone?: string;
    upiId?: string;
  };
}): string {
  const { invoice, patient, clinicSettings } = data;
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const patientName = `${patient.firstName} ${patient.lastName}`;
  
  let message = `Hello ${patientName},\n\n`;
  message += `Your invoice has been generated:\n\n`;
  message += `📋 Invoice: ${invoice.invoiceNumber}\n`;
  message += `📅 Date: ${formatDate(invoice.createdAt)}\n`;
  message += `👤 Patient: ${patientName}\n\n`;

  // Add items if available
  if (invoice.items && invoice.items.length > 0) {
    message += `Services:\n`;
    invoice.items.forEach((item) => {
      const qty = item.quantity > 1 ? ` (${item.quantity}x)` : '';
      message += `• ${item.description}${qty} - ${formatCurrency(item.amount)}\n`;
    });
    message += `\n`;
  }

  // Add totals
  message += `Subtotal: ${formatCurrency(invoice.subtotal)}\n`;
  if (invoice.discount > 0) {
    message += `Discount: -${formatCurrency(invoice.discount)}\n`;
  }
  if (invoice.tax > 0) {
    message += `Tax: ${formatCurrency(invoice.tax)}\n`;
  }
  message += `━━━━━━━━━━━━━━━━\n`;
  message += `Total: ${formatCurrency(invoice.totalAmount)}\n`;
  if (invoice.paidAmount > 0) {
    message += `Paid: ${formatCurrency(invoice.paidAmount)}\n`;
  }
  message += `Due: ${formatCurrency(invoice.dueAmount)}\n\n`;

  // Add UPI payment info if configured
  if (clinicSettings.upiId && invoice.dueAmount > 0) {
    message += `💳 Payment via UPI:\n`;
    message += `${clinicSettings.upiId} (Amount: ${formatCurrency(invoice.dueAmount)})\n\n`;
  }

  // Add due date if available
  if (invoice.dueDate) {
    message += `Due Date: ${formatDate(invoice.dueDate)}\n\n`;
  }

  // Add notes if available
  if (invoice.notes) {
    message += `Notes: ${invoice.notes}\n\n`;
  }

  message += `Thank you!\n`;
  message += `${clinicSettings.name}\n`;
  if (clinicSettings.phone) {
    message += `${clinicSettings.phone}\n`;
  }

  return message;
}

/**
 * Generates a payment update message for WhatsApp
 */
export function generatePaymentUpdateMessage(data: {
  payment: {
    amount: number;
    paymentMode: string;
    paymentDate: string;
  };
  invoice: {
    invoiceNumber: string;
    dueAmount: number;
  };
  patient: {
    firstName: string;
    lastName: string;
  };
  clinicSettings: {
    name: string;
  };
}): string {
  const { payment, invoice, patient, clinicSettings } = data;
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const patientName = `${patient.firstName} ${patient.lastName}`;
  
  let message = `Hello ${patientName},\n\n`;
  message += `Payment received successfully!\n\n`;
  message += `📋 Invoice: ${invoice.invoiceNumber}\n`;
  message += `💰 Amount: ${formatCurrency(payment.amount)}\n`;
  message += `💳 Mode: ${payment.paymentMode}\n`;
  message += `📅 Date: ${formatDate(payment.paymentDate)}\n\n`;

  if (invoice.dueAmount > 0) {
    message += `Remaining Balance: ${formatCurrency(invoice.dueAmount)}\n\n`;
  } else {
    message += `✅ Invoice fully paid!\n\n`;
  }

  message += `Thank you for your payment!\n`;
  message += `${clinicSettings.name}`;

  return message;
}

/**
 * Opens WhatsApp with invoice message
 */
export function sendInvoiceMessage(data: {
  phone: string;
  invoice: {
    invoiceNumber: string;
    createdAt: string;
    dueDate?: string;
    subtotal: number;
    discount: number;
    tax: number;
    totalAmount: number;
    paidAmount: number;
    dueAmount: number;
    items?: Array<{
      description: string;
      quantity: number;
      unitPrice: number;
      amount: number;
    }>;
    notes?: string;
  };
  patient: {
    firstName: string;
    lastName: string;
  };
  clinicSettings: {
    name: string;
    phone?: string;
    upiId?: string;
  };
}): void {
  const message = generateInvoiceMessage(data);
  openWhatsApp(data.phone, message);
}

/**
 * Opens WhatsApp with payment update message
 */
export function sendPaymentUpdateMessage(data: {
  phone: string;
  payment: {
    amount: number;
    paymentMode: string;
    paymentDate: string;
  };
  invoice: {
    invoiceNumber: string;
    dueAmount: number;
  };
  patient: {
    firstName: string;
    lastName: string;
  };
  clinicSettings: {
    name: string;
  };
}): void {
  const message = generatePaymentUpdateMessage(data);
  openWhatsApp(data.phone, message);
}

/**
 * Generates a message for PDF attachment via WhatsApp
 */
export function generatePDFAttachmentMessage(data: {
  patient: {
    firstName: string;
    lastName: string;
  };
  invoice: {
    invoiceNumber: string;
  };
  clinicSettings: {
    name: string;
  };
}): string {
  const { patient, invoice, clinicSettings } = data;
  const patientName = `${patient.firstName} ${patient.lastName}`;
  
  let message = `Hello ${patientName},\n\n`;
  message += `Please find attached your invoice: ${invoice.invoiceNumber}\n\n`;
  message += `Thank you!\n`;
  message += `${clinicSettings.name}`;

  return message;
}

/**
 * Opens WhatsApp with PDF attachment message
 */
export function openWhatsAppWithPDFMessage(data: {
  phone: string;
  patient: {
    firstName: string;
    lastName: string;
  };
  invoice: {
    invoiceNumber: string;
  };
  clinicSettings: {
    name: string;
  };
}): void {
  const message = generatePDFAttachmentMessage(data);
  openWhatsApp(data.phone, message);
}
