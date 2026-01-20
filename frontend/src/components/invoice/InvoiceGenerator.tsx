import { Invoice, InvoiceTemplate } from '../../types';
import { format } from 'date-fns';

interface InvoiceGeneratorProps {
  invoice: Invoice;
  template: InvoiceTemplate;
  clinicSettings: {
    name: string;
    logo: string;
    phone?: string;
    address?: string;
  };
}

export const generateInvoiceHTML = ({
  invoice,
  template,
  clinicSettings,
}: InvoiceGeneratorProps): string => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Determine logo display - handle uploaded files, URLs, and emojis
  const getLogoUrl = (logo: string): string | null => {
    if (!logo) return null;
    
    // Uploaded file path
    if (logo.startsWith('/uploads/')) {
      // Construct full URL for uploaded files
      // In development, API runs on port 5000, in production it's same origin
      const apiUrl = import.meta.env.VITE_API_URL;
      if (apiUrl && apiUrl !== '/api') {
        // Full URL provided (e.g., http://localhost:5000)
        return `${apiUrl}${logo}`;
      }
      // Same origin - use relative path (will work in production)
      return logo;
    }
    
    // External URL
    if (logo.startsWith('http://') || logo.startsWith('https://')) {
      return logo;
    }
    
    // Emoji or other text - return null to render as text
    return null;
  };

  const logoUrl = getLogoUrl(clinicSettings.logo);
  const logoHtml = logoUrl
    ? `<img src="${logoUrl}" alt="Logo" style="max-height: 60px; max-width: 150px; object-fit: contain;" onerror="this.style.display='none';" />`
    : clinicSettings.logo
    ? `<div style="font-size: 48px; line-height: 1;">${clinicSettings.logo}</div>`
    : '';

  // Header styles based on template
  const headerStyle = template.headerBgColor
    ? `background-color: ${template.headerBgColor}; padding: 20px; border-radius: 8px; margin-bottom: 20px;`
    : 'padding: 20px 0; margin-bottom: 20px;';

  // Footer styles
  const footerStyle = template.footerBgColor
    ? `background-color: ${template.footerBgColor}; padding: 20px; border-radius: 8px; margin-top: 30px;`
    : 'padding: 20px 0; margin-top: 30px; border-top: 2px solid #e2e8f0;';

  // Table styles based on template
  const getTableStyle = () => {
    switch (template.itemTableStyle) {
      case 'striped':
        return `
          border-collapse: collapse;
          width: 100%;
        `;
      case 'minimal':
        return `
          border-collapse: collapse;
          width: 100%;
          border: none;
        `;
      default: // bordered
        return `
          border-collapse: collapse;
          width: 100%;
          border: 1px solid #ddd;
        `;
    }
  };

  const getTableHeaderStyle = () => {
    const baseStyle = `
      padding: 12px;
      text-align: left;
      font-weight: 600;
      background-color: ${template.primaryColor}15;
      color: ${template.primaryColor};
    `;
    
    if (template.itemTableStyle === 'minimal') {
      return baseStyle + 'border-bottom: 2px solid ' + template.primaryColor + ';';
    }
    return baseStyle + 'border: 1px solid #ddd;';
  };

  const getTableCellStyle = (isHeader = false) => {
    const baseStyle = `padding: 10px 12px;`;
    
    if (template.itemTableStyle === 'minimal') {
      return baseStyle + (isHeader ? '' : 'border-bottom: 1px solid #e2e8f0;');
    }
    return baseStyle + 'border: 1px solid #ddd;';
  };

  const getRowStyle = (index: number) => {
    if (template.itemTableStyle === 'striped' && index % 2 === 0) {
      return 'background-color: #f8f9fa;';
    }
    return '';
  };

  // Totals alignment
  const totalsAlign = template.totalsPosition === 'left' ? 'left' : template.totalsPosition === 'center' ? 'center' : 'right';

  // Build header
  let headerHtml = '<div style="' + headerStyle + '">';
  
  if (template.logoPosition === 'left') {
    headerHtml += '<div style="display: flex; align-items: center; gap: 20px;">';
    if (logoHtml) headerHtml += '<div>' + logoHtml + '</div>';
    headerHtml += '<div style="flex: 1;">';
  } else if (template.logoPosition === 'center') {
    headerHtml += '<div style="text-align: center;">';
    if (logoHtml) headerHtml += '<div style="margin-bottom: 10px;">' + logoHtml + '</div>';
  } else if (template.logoPosition === 'right') {
    headerHtml += '<div style="display: flex; align-items: center; gap: 20px; flex-direction: row-reverse;">';
    if (logoHtml) headerHtml += '<div>' + logoHtml + '</div>';
    headerHtml += '<div style="flex: 1;">';
  } else {
    headerHtml += '<div>';
  }

  if (template.showClinicName && clinicSettings.name) {
    headerHtml += `<h1 style="margin: 0 0 10px 0; color: ${template.primaryColor}; font-size: 28px;">${clinicSettings.name}</h1>`;
  }

  if (template.showAddress && clinicSettings.address) {
    headerHtml += `<p style="margin: 5px 0; color: #64748b;">${clinicSettings.address}</p>`;
  }

  if (template.showContact && clinicSettings.phone) {
    headerHtml += `<p style="margin: 5px 0; color: #64748b;">Phone: ${clinicSettings.phone}</p>`;
  }

  headerHtml += '</div></div></div>';

  // Build invoice info section
  let invoiceInfoHtml = `
    <div style="margin: 30px 0; display: flex; justify-content: space-between; align-items: flex-start;">
      <div>
        <h2 style="margin: 0 0 10px 0; color: ${template.primaryColor};">Invoice: ${invoice.invoiceNumber}</h2>
        <p style="margin: 5px 0; color: #64748b;">Date: ${format(new Date(invoice.createdAt), 'PP')}</p>
        ${template.showDueDate && invoice.dueDate ? `<p style="margin: 5px 0; color: #64748b;">Due Date: ${format(new Date(invoice.dueDate), 'PP')}</p>` : ''}
      </div>
      <div style="text-align: right;">
        <h3 style="margin: 0 0 10px 0;">Patient Information</h3>
        <p style="margin: 5px 0; font-weight: 600;">${invoice.patient?.firstName} ${invoice.patient?.lastName}</p>
        <p style="margin: 5px 0; color: #64748b;">ID: ${invoice.patient?.patientId}</p>
        ${invoice.patient?.phone ? `<p style="margin: 5px 0; color: #64748b;">Phone: ${invoice.patient?.phone}</p>` : ''}
      </div>
    </div>
  `;

  // Build items table
  let tableHtml = `
    <table style="${getTableStyle()}">
      <thead>
        <tr>
          <th style="${getTableHeaderStyle()}">Description</th>
          <th style="${getTableHeaderStyle()}; text-align: right;">Quantity</th>
          <th style="${getTableHeaderStyle()}; text-align: right;">Unit Price</th>
          <th style="${getTableHeaderStyle()}; text-align: right;">Amount</th>
        </tr>
      </thead>
      <tbody>
  `;

  invoice.items?.forEach((item: any, index: number) => {
    tableHtml += `
      <tr style="${getRowStyle(index)}">
        <td style="${getTableCellStyle()}">${item.description}</td>
        <td style="${getTableCellStyle()}; text-align: right;">${item.quantity || 1}</td>
        <td style="${getTableCellStyle()}; text-align: right;">${formatCurrency(item.unitPrice)}</td>
        <td style="${getTableCellStyle()}; text-align: right; font-weight: 500;">${formatCurrency(item.amount)}</td>
      </tr>
    `;
  });

  tableHtml += '</tbody></table>';

  // Build totals section
  let totalsHtml = `
    <div style="margin-top: 30px; text-align: ${totalsAlign};">
      <div style="display: inline-block; min-width: 300px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <span>Subtotal:</span>
          <span>${formatCurrency(invoice.subtotal)}</span>
        </div>
        ${invoice.discount > 0 ? `
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px; color: #ef4444;">
            <span>Discount:</span>
            <span>-${formatCurrency(invoice.discount)}</span>
          </div>
        ` : ''}
        ${invoice.tax > 0 ? `
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span>${template.taxLabel}:</span>
            <span>${formatCurrency(invoice.tax)}</span>
          </div>
          ${template.taxId ? `<div style="font-size: 12px; color: #64748b; margin-bottom: 8px;">${template.taxId}</div>` : ''}
        ` : ''}
        <div style="border-top: 2px solid ${template.primaryColor}; margin: 10px 0; padding-top: 10px;">
          <div style="display: flex; justify-content: space-between; font-size: 18px; font-weight: 700; margin-bottom: 8px;">
            <span>Total:</span>
            <span style="color: ${template.primaryColor};">${formatCurrency(invoice.totalAmount)}</span>
          </div>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px; color: #10b981;">
          <span>Paid:</span>
          <span>${formatCurrency(invoice.paidAmount)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 16px; font-weight: 600; color: ${invoice.dueAmount > 0 ? '#ef4444' : '#10b981'};">
          <span>Due:</span>
          <span>${formatCurrency(invoice.dueAmount)}</span>
        </div>
      </div>
    </div>
  `;

  // Payment methods section
  let paymentMethodsHtml = '';
  if (template.showPaymentMethods && invoice.payments && invoice.payments.length > 0) {
    paymentMethodsHtml = `
      <div style="margin-top: 30px;">
        <h3 style="color: ${template.primaryColor};">Payment History</h3>
        <table style="${getTableStyle()}">
          <thead>
            <tr>
              <th style="${getTableHeaderStyle()}">Date</th>
              <th style="${getTableHeaderStyle()}; text-align: right;">Amount</th>
              <th style="${getTableHeaderStyle()}">Mode</th>
            </tr>
          </thead>
          <tbody>
    `;
    invoice.payments.forEach((payment: any, index: number) => {
      paymentMethodsHtml += `
        <tr style="${getRowStyle(index)}">
          <td style="${getTableCellStyle()}">${format(new Date(payment.paymentDate), 'PP')}</td>
          <td style="${getTableCellStyle()}; text-align: right;">${formatCurrency(payment.amount)}</td>
          <td style="${getTableCellStyle()}">${payment.paymentMode}</td>
        </tr>
      `;
    });
    paymentMethodsHtml += '</tbody></table></div>';
  }

  // Payment terms
  let paymentTermsHtml = '';
  if (template.paymentTerms) {
    paymentTermsHtml = `
      <div style="margin-top: 30px; padding: 15px; background-color: #f8f9fa; border-radius: 8px;">
        <h4 style="margin: 0 0 10px 0; color: ${template.primaryColor};">Payment Terms</h4>
        <p style="margin: 0; white-space: pre-line;">${template.paymentTerms}</p>
        ${template.lateFeeEnabled && template.lateFeePercent ? `
          <p style="margin: 10px 0 0 0; color: #ef4444; font-weight: 600;">
            Late fee of ${template.lateFeePercent}% will be applied after ${template.lateFeeDays || 30} days.
          </p>
        ` : ''}
      </div>
    `;
  }

  // Footer
  let footerHtml = '';
  if (template.footerText || template.showSignature) {
    footerHtml = `<div style="${footerStyle}">`;
    if (template.footerText) {
      footerHtml += `<div style="margin-bottom: ${template.showSignature ? '20px' : '0'}; white-space: pre-line;">${template.footerText}</div>`;
    }
    if (template.showSignature) {
      footerHtml += `
        <div style="margin-top: 40px;">
          <div style="border-top: 1px solid #ddd; width: 200px; margin-bottom: 5px;"></div>
          <div style="font-size: 12px; color: #64748b;">${template.signatureLabel || 'Authorized Signature'}</div>
        </div>
      `;
    }
    footerHtml += '</div>';
  }

  // Notes
  let notesHtml = '';
  if (invoice.notes) {
    notesHtml = `
      <div style="margin-top: 30px; padding: 15px; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
        <strong>Notes:</strong> ${invoice.notes}
      </div>
    `;
  }

  // Combine all sections
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>Invoice ${invoice.invoiceNumber}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: ${template.fontFamily};
            color: #1e293b;
            line-height: 1.6;
            padding: 40px;
            background: #fff;
          }
          @media print {
            body {
              padding: 20px;
            }
            @page {
              margin: 1cm;
            }
          }
          h1, h2, h3, h4 {
            color: ${template.primaryColor};
          }
          table {
            margin: 20px 0;
          }
        </style>
      </head>
      <body>
        ${headerHtml}
        ${invoiceInfoHtml}
        ${tableHtml}
        ${totalsHtml}
        ${paymentMethodsHtml}
        ${paymentTermsHtml}
        ${notesHtml}
        ${footerHtml}
      </body>
    </html>
  `;

  return html;
};
