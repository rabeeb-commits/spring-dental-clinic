import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import PDFDocument from 'pdfkit';
import { authenticate } from '../middleware/auth';
import { checkPermission } from '../middleware/permissions';
import { generateInvoiceNumber, parsePagination, getPaginationMeta } from '../utils/helpers';
import path from 'path';
import fs from 'fs';

const router = Router();
const prisma = new PrismaClient();

// GET /api/invoices - Get all invoices
router.get(
  '/',
  authenticate,
  checkPermission('invoices', 'read'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { page, limit, skip } = parsePagination(
        req.query.page as string,
        req.query.limit as string
      );
      const { patientId, status, startDate, endDate, search } = req.query;

      const where: any = {};

      if (patientId) where.patientId = patientId;
      if (status) where.status = status;

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate as string);
        if (endDate) where.createdAt.lte = new Date(endDate as string);
      }

      if (search) {
        where.OR = [
          { invoiceNumber: { contains: search as string, mode: 'insensitive' } },
          {
            patient: {
              OR: [
                { firstName: { contains: search as string, mode: 'insensitive' } },
                { lastName: { contains: search as string, mode: 'insensitive' } },
                { patientId: { contains: search as string, mode: 'insensitive' } },
              ],
            },
          },
        ];
      }

      const [invoices, total] = await Promise.all([
        prisma.invoice.findMany({
          where,
          include: {
            patient: {
              select: {
                id: true,
                patientId: true,
                firstName: true,
                lastName: true,
                phone: true,
              },
            },
            treatment: {
              select: {
                id: true,
                title: true,
              },
            },
            _count: {
              select: { payments: true },
            },
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.invoice.count({ where }),
      ]);

      res.json({
        success: true,
        data: invoices,
        meta: getPaginationMeta(total, page, limit),
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/invoices/outstanding - Get outstanding invoices
router.get(
  '/outstanding',
  authenticate,
  checkPermission('invoices', 'read'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const invoices = await prisma.invoice.findMany({
        where: {
          status: { in: ['PENDING', 'PARTIAL'] },
          dueAmount: { gt: 0 },
        },
        include: {
          patient: {
            select: {
              id: true,
              patientId: true,
              firstName: true,
              lastName: true,
              phone: true,
            },
          },
        },
        orderBy: { dueDate: 'asc' },
      });

      const totalOutstanding = invoices.reduce((sum, inv) => sum + inv.dueAmount, 0);

      res.json({
        success: true,
        data: {
          invoices,
          totalOutstanding,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/invoices/patient/:patientId - Get patient's invoices
router.get(
  '/patient/:patientId',
  authenticate,
  checkPermission('invoices', 'read'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { patientId } = req.params;

      const invoices = await prisma.invoice.findMany({
        where: { patientId },
        include: {
          treatment: {
            select: {
              id: true,
              title: true,
            },
          },
          items: true,
          payments: {
            include: {
              receivedBy: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      res.json({
        success: true,
        data: invoices,
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/invoices/:id/pdf - Generate invoice PDF (must be before /:id route)
router.get(
  '/:id/pdf',
  authenticate,
  checkPermission('invoices', 'read'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      // Fetch invoice with all relations
      const invoice = await prisma.invoice.findUnique({
        where: { id },
        include: {
          patient: {
            select: {
              id: true,
              patientId: true,
              firstName: true,
              lastName: true,
              phone: true,
              email: true,
              address: true,
            },
          },
          treatment: {
            select: {
              id: true,
              title: true,
            },
          },
          items: true,
          payments: {
            include: {
              receivedBy: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
            orderBy: { paymentDate: 'desc' },
          },
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      if (!invoice) {
        res.status(404).json({
          success: false,
          message: 'Invoice not found',
        });
        return;
      }

      // Fetch default invoice template
      let template = await prisma.invoiceTemplate.findFirst({
        where: { isDefault: true },
      });

      // If no template, use defaults
      if (!template) {
        template = {
          id: 'default',
          name: 'Default',
          isDefault: true,
          logoPosition: 'left',
          showClinicName: true,
          showAddress: true,
          showContact: true,
          templateStyle: 'classic',
          itemTableStyle: 'bordered',
          totalsPosition: 'right',
          paymentTerms: null,
          showDueDate: true,
          showPaymentMethods: true,
          lateFeeEnabled: false,
          lateFeePercent: 0,
          lateFeeDays: 30,
          taxLabel: 'Tax',
          taxType: 'percentage',
          showTaxBreakdown: false,
          taxId: null,
          footerText: null,
          showSignature: false,
          signatureLabel: 'Authorized Signature',
          primaryColor: '#0891b2',
          headerBgColor: null,
          footerBgColor: null,
          fontFamily: 'Arial, sans-serif',
          createdAt: new Date(),
          updatedAt: new Date(),
        } as NonNullable<typeof template>;
      }

      // TypeScript now knows template is not null after the if block
      const invoiceTemplate = template;

      // Create PDF document
      const doc = new PDFDocument({ 
        margin: 50,
        size: 'A4',
      });

      // Set response headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="invoice-${invoice.invoiceNumber}.pdf"`
      );

      // Pipe to response
      doc.pipe(res);

      // Helper function to format currency
      const formatCurrency = (amount: number): string => {
        return new Intl.NumberFormat('en-IN', {
          style: 'currency',
          currency: 'INR',
          maximumFractionDigits: 0,
        }).format(amount);
      };

      // Helper function to format date
      const formatDate = (date: Date | string): string => {
        const d = typeof date === 'string' ? new Date(date) : date;
        return d.toLocaleDateString('en-IN', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      };

      // Get clinic settings from query parameters (passed from frontend) or environment variables
      const clinicName = (req.query.clinicName as string) || process.env.CLINIC_NAME || 'DentalCare';
      const clinicAddress = (req.query.clinicAddress as string) || process.env.CLINIC_ADDRESS || '';
      const clinicPhone = (req.query.clinicPhone as string) || process.env.CLINIC_PHONE || '';
      const clinicLogo = (req.query.clinicLogo as string) || process.env.CLINIC_LOGO || '';

      // Header Section
      let yPosition = 50;

      // Logo handling (if available)
      if (clinicLogo && (clinicLogo.startsWith('http') || clinicLogo.startsWith('/uploads/'))) {
        try {
          let logoPath: string | null = null;
          
          if (clinicLogo.startsWith('/uploads/')) {
            const fullPath = path.join(__dirname, '../../', clinicLogo);
            if (fs.existsSync(fullPath)) {
              logoPath = fullPath;
            }
          }

          if (logoPath) {
            doc.image(logoPath, 50, yPosition, { width: 60, height: 60, fit: [60, 60] });
          }
        } catch (error) {
          // Logo loading failed, continue without it
        }
      }

      // Clinic name and info
      const headerX = invoiceTemplate.logoPosition === 'left' && clinicLogo ? 120 : 50;
      
      if (invoiceTemplate.showClinicName) {
        doc.fontSize(20)
           .font('Helvetica-Bold')
           .fillColor(invoiceTemplate.primaryColor)
           .text(clinicName, headerX, yPosition);
        yPosition += 25;
      }

      if (invoiceTemplate.showAddress && clinicAddress) {
        doc.fontSize(10)
           .font('Helvetica')
           .fillColor('#000000')
           .text(clinicAddress, headerX, yPosition, { width: 300 });
        yPosition += 15;
      }

      if (invoiceTemplate.showContact && clinicPhone) {
        doc.fontSize(10)
           .font('Helvetica')
           .fillColor('#000000')
           .text(`Phone: ${clinicPhone}`, headerX, yPosition);
        yPosition += 15;
      }

      // Invoice title and info
      yPosition += 20;
      doc.fontSize(18)
         .font('Helvetica-Bold')
         .fillColor(invoiceTemplate.primaryColor)
         .text('INVOICE', 50, yPosition);
      
      yPosition += 25;
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .fillColor('#000000')
         .text(`Invoice Number: ${invoice.invoiceNumber}`, 50, yPosition);
      
      yPosition += 15;
      doc.fontSize(10)
         .font('Helvetica')
         .text(`Date: ${formatDate(invoice.createdAt)}`, 50, yPosition);

      if (invoiceTemplate.showDueDate && invoice.dueDate) {
        yPosition += 15;
        doc.text(`Due Date: ${formatDate(invoice.dueDate)}`, 50, yPosition);
      }

      // Patient information (right side)
      const patientX = 350;
      let patientY = yPosition - 40;
      
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .text('Bill To:', patientX, patientY);
      
      patientY += 15;
      doc.fontSize(10)
         .font('Helvetica')
         .text(`${invoice.patient.firstName} ${invoice.patient.lastName}`, patientX, patientY);
      
      patientY += 12;
      doc.text(`ID: ${invoice.patient.patientId}`, patientX, patientY);
      
      if (invoice.patient.phone) {
        patientY += 12;
        doc.text(`Phone: ${invoice.patient.phone}`, patientX, patientY);
      }

      // Items table
      yPosition = Math.max(yPosition, patientY) + 30;
      
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .text('Items', 50, yPosition);
      
      yPosition += 20;

      // Table header
      const tableTop = yPosition;
      const itemHeight = 20;
      const col1 = 50;  // Description
      const col2 = 350; // Quantity
      const col3 = 400; // Unit Price
      const col4 = 480; // Amount

      doc.fontSize(10)
         .font('Helvetica-Bold')
         .fillColor('#ffffff')
         .rect(col1, tableTop, 500, itemHeight)
         .fill(invoiceTemplate.primaryColor);
      
      doc.text('Description', col1 + 5, tableTop + 5);
      doc.text('Qty', col2, tableTop + 5, { width: 50, align: 'center' });
      doc.text('Price', col3, tableTop + 5, { width: 80, align: 'right' });
      doc.text('Amount', col4, tableTop + 5, { width: 70, align: 'right' });

      yPosition = tableTop + itemHeight;

      // Table rows
      doc.fillColor('#000000');
      invoice.items.forEach((item, index) => {
        if (invoiceTemplate.itemTableStyle === 'striped' && index % 2 === 0) {
          doc.rect(col1, yPosition, 500, itemHeight)
             .fillColor('#f8f9fa')
             .fill()
             .fillColor('#000000');
        }

        if (invoiceTemplate.itemTableStyle === 'bordered') {
          doc.rect(col1, yPosition, 500, itemHeight)
             .strokeColor('#e2e8f0')
             .lineWidth(0.5)
             .stroke();
        }

        doc.fontSize(9)
           .font('Helvetica')
           .text(item.description, col1 + 5, yPosition + 5, { width: 290 });
        doc.text(String(item.quantity || 1), col2, yPosition + 5, { width: 50, align: 'center' });
        doc.text(formatCurrency(item.unitPrice), col3, yPosition + 5, { width: 80, align: 'right' });
        doc.text(formatCurrency(item.amount), col4, yPosition + 5, { width: 70, align: 'right' });

        yPosition += itemHeight;
      });

      // Totals section
      yPosition += 20;
      const totalsX = invoiceTemplate.totalsPosition === 'left' ? 50 : invoiceTemplate.totalsPosition === 'center' ? 275 : 400;
      const totalsWidth = 150;

      doc.fontSize(10)
         .font('Helvetica');

      let totalsY = yPosition;
      doc.text('Subtotal:', totalsX, totalsY, { width: 100, align: 'right' });
      doc.text(formatCurrency(invoice.subtotal), totalsX + 110, totalsY, { width: 40, align: 'right' });
      totalsY += 15;

      if (invoice.discount > 0) {
        doc.fillColor('#ef4444');
        doc.text('Discount:', totalsX, totalsY, { width: 100, align: 'right' });
        doc.text(`-${formatCurrency(invoice.discount)}`, totalsX + 110, totalsY, { width: 40, align: 'right' });
        doc.fillColor('#000000');
        totalsY += 15;
      }

      if (invoice.tax > 0) {
        doc.text(`${invoiceTemplate.taxLabel}:`, totalsX, totalsY, { width: 100, align: 'right' });
        doc.text(formatCurrency(invoice.tax), totalsX + 110, totalsY, { width: 40, align: 'right' });
        totalsY += 15;
      }

      // Total line
      totalsY += 5;
      doc.moveTo(totalsX, totalsY)
         .lineTo(totalsX + totalsWidth, totalsY)
         .strokeColor(invoiceTemplate.primaryColor)
         .lineWidth(2)
         .stroke();
      totalsY += 10;

      doc.fontSize(12)
         .font('Helvetica-Bold')
         .fillColor(invoiceTemplate.primaryColor);
      doc.text('Total:', totalsX, totalsY, { width: 100, align: 'right' });
      doc.text(formatCurrency(invoice.totalAmount), totalsX + 110, totalsY, { width: 40, align: 'right' });
      totalsY += 20;

      doc.fontSize(10)
         .font('Helvetica')
         .fillColor('#000000');
      doc.text('Paid:', totalsX, totalsY, { width: 100, align: 'right' });
      doc.fillColor('#22c55e');
      doc.text(formatCurrency(invoice.paidAmount), totalsX + 110, totalsY, { width: 40, align: 'right' });
      totalsY += 15;

      doc.fontSize(11)
         .font('Helvetica-Bold')
         .fillColor(invoice.dueAmount > 0 ? '#ef4444' : '#22c55e');
      doc.text('Due:', totalsX, totalsY, { width: 100, align: 'right' });
      doc.text(formatCurrency(invoice.dueAmount), totalsX + 110, totalsY, { width: 40, align: 'right' });

      // Payment history
      if (invoiceTemplate.showPaymentMethods && invoice.payments && invoice.payments.length > 0) {
        yPosition = Math.max(totalsY, yPosition) + 30;
        
        doc.fontSize(12)
           .font('Helvetica-Bold')
           .fillColor(invoiceTemplate.primaryColor)
           .text('Payment History', 50, yPosition);
        
        yPosition += 20;

        invoice.payments.forEach((payment) => {
          doc.fontSize(9)
             .font('Helvetica')
             .fillColor('#000000')
             .text(`${formatDate(payment.paymentDate)} - ${formatCurrency(payment.amount)} - ${payment.paymentMode}`, 50, yPosition);
          yPosition += 15;
        });
      }

      // Notes
      if (invoice.notes) {
        yPosition += 20;
        doc.fontSize(10)
           .font('Helvetica-Bold')
           .text('Notes:', 50, yPosition);
        yPosition += 15;
        doc.fontSize(9)
           .font('Helvetica')
           .text(invoice.notes, 50, yPosition, { width: 500 });
      }

      // Footer
      const pageHeight = doc.page.height;
      const footerY = pageHeight - 50;

      if (invoiceTemplate.footerText) {
        doc.fontSize(8)
           .font('Helvetica')
           .fillColor('#64748b')
           .text(invoiceTemplate.footerText, 50, footerY - 30, { width: 500, align: 'center' });
      }

      if (invoiceTemplate.showSignature) {
        doc.moveTo(50, footerY - 10)
           .lineTo(250, footerY - 10)
           .strokeColor('#000000')
           .lineWidth(0.5)
           .stroke();
        doc.fontSize(8)
           .font('Helvetica')
           .fillColor('#64748b')
           .text(invoiceTemplate.signatureLabel || 'Authorized Signature', 50, footerY - 5);
      }

      // Generated date
      doc.fontSize(8)
         .font('Helvetica')
         .fillColor('#64748b')
         .text(`Generated on: ${new Date().toLocaleString()}`, 50, footerY, { width: 500, align: 'center' });

      // Finalize PDF
      doc.end();

    } catch (error) {
      next(error);
    }
  }
);

// GET /api/invoices/:id - Get invoice by ID
router.get(
  '/:id',
  authenticate,
  checkPermission('invoices', 'read'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      const invoice = await prisma.invoice.findUnique({
        where: { id },
        include: {
          patient: {
            select: {
              id: true,
              patientId: true,
              firstName: true,
              lastName: true,
              phone: true,
              email: true,
              address: true,
            },
          },
          treatment: {
            select: {
              id: true,
              title: true,
              procedures: {
                include: {
                  procedureType: true,
                },
              },
            },
          },
          items: true,
          payments: {
            include: {
              receivedBy: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
            orderBy: { paymentDate: 'desc' },
          },
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      if (!invoice) {
        res.status(404).json({
          success: false,
          message: 'Invoice not found',
        });
        return;
      }

      res.json({
        success: true,
        data: invoice,
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/invoices - Create invoice
router.post(
  '/',
  authenticate,
  checkPermission('invoices', 'create'),
  [
    body('patientId').notEmpty().withMessage('Patient ID is required'),
    body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
    body('items.*.description').notEmpty().withMessage('Item description is required'),
    body('items.*.unitPrice').isFloat({ min: 0 }).withMessage('Valid unit price is required'),
  ],
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, errors: errors.array() });
        return;
      }

      const { patientId, treatmentId, items, discount, tax, dueDate, notes } = req.body;

      // Generate invoice number
      const invoiceNumber = await generateInvoiceNumber();

      // Calculate totals
      const subtotal = items.reduce((sum: number, item: any) => {
        const quantity = item.quantity || 1;
        return sum + item.unitPrice * quantity;
      }, 0);

      const discountAmount = discount || 0;
      const taxAmount = tax || 0;
      const totalAmount = subtotal - discountAmount + taxAmount;

      const invoice = await prisma.invoice.create({
        data: {
          invoiceNumber,
          patientId,
          treatmentId,
          subtotal,
          discount: discountAmount,
          tax: taxAmount,
          totalAmount,
          dueAmount: totalAmount,
          dueDate: dueDate ? new Date(dueDate) : null,
          notes,
          createdById: req.user!.id,
          items: {
            create: items.map((item: any) => ({
              description: item.description,
              toothNumbers: item.toothNumbers || [],
              quantity: item.quantity || 1,
              unitPrice: item.unitPrice,
              amount: (item.quantity || 1) * item.unitPrice,
            })),
          },
        },
        include: {
          patient: {
            select: {
              id: true,
              patientId: true,
              firstName: true,
              lastName: true,
            },
          },
          items: true,
        },
      });

      // Log activity
      await prisma.activityLog.create({
        data: {
          userId: req.user!.id,
          action: 'CREATE',
          entityType: 'Invoice',
          entityId: invoice.id,
          description: `Created invoice: ${invoice.invoiceNumber}`,
        },
      });

      res.status(201).json({
        success: true,
        message: 'Invoice created successfully',
        data: invoice,
      });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/invoices/:id - Update invoice
router.put(
  '/:id',
  authenticate,
  checkPermission('invoices', 'update'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { discount, tax, dueDate, notes, status } = req.body;

      // Get current invoice
      const currentInvoice = await prisma.invoice.findUnique({
        where: { id },
      });

      if (!currentInvoice) {
        res.status(404).json({
          success: false,
          message: 'Invoice not found',
        });
        return;
      }

      // Recalculate if discount or tax changed
      let updateData: any = {
        ...(notes !== undefined && { notes }),
        ...(dueDate && { dueDate: new Date(dueDate) }),
        ...(status && { status }),
      };

      if (discount !== undefined || tax !== undefined) {
        const newDiscount = discount !== undefined ? discount : currentInvoice.discount;
        const newTax = tax !== undefined ? tax : currentInvoice.tax;
        const newTotal = currentInvoice.subtotal - newDiscount + newTax;
        const newDue = newTotal - currentInvoice.paidAmount;

        updateData = {
          ...updateData,
          discount: newDiscount,
          tax: newTax,
          totalAmount: newTotal,
          dueAmount: newDue,
        };
      }

      const invoice = await prisma.invoice.update({
        where: { id },
        data: updateData,
        include: {
          patient: {
            select: {
              id: true,
              patientId: true,
              firstName: true,
              lastName: true,
            },
          },
          items: true,
        },
      });

      res.json({
        success: true,
        message: 'Invoice updated successfully',
        data: invoice,
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/invoices/:id/items - Add item to invoice
router.post(
  '/:id/items',
  authenticate,
  [
    body('description').notEmpty().withMessage('Description is required'),
    body('unitPrice').isFloat({ min: 0 }).withMessage('Valid unit price is required'),
  ],
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, errors: errors.array() });
        return;
      }

      const { id } = req.params;
      const { description, toothNumbers, quantity, unitPrice } = req.body;

      const qty = quantity || 1;
      const amount = qty * unitPrice;

      const item = await prisma.invoiceItem.create({
        data: {
          invoiceId: id,
          description,
          toothNumbers: toothNumbers || [],
          quantity: qty,
          unitPrice,
          amount,
        },
      });

      // Update invoice totals
      const invoice = await prisma.invoice.findUnique({
        where: { id },
        include: { items: true },
      });

      if (invoice) {
        const newSubtotal = invoice.items.reduce((sum, i) => sum + i.amount, 0);
        const newTotal = newSubtotal - invoice.discount + invoice.tax;
        const newDue = newTotal - invoice.paidAmount;

        await prisma.invoice.update({
          where: { id },
          data: {
            subtotal: newSubtotal,
            totalAmount: newTotal,
            dueAmount: newDue,
          },
        });
      }

      res.status(201).json({
        success: true,
        message: 'Item added successfully',
        data: item,
      });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/invoices/:id - Cancel invoice
router.delete(
  '/:id',
  authenticate,
  checkPermission('invoices', 'delete'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      const invoice = await prisma.invoice.findUnique({
        where: { id },
      });

      if (!invoice) {
        res.status(404).json({
          success: false,
          message: 'Invoice not found',
        });
        return;
      }

      if (invoice.paidAmount > 0) {
        res.status(400).json({
          success: false,
          message: 'Cannot cancel invoice with payments. Process refund first.',
        });
        return;
      }

      await prisma.invoice.update({
        where: { id },
        data: { status: 'CANCELLED' },
      });

      res.json({
        success: true,
        message: 'Invoice cancelled successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;



