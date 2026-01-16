import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import { generateInvoiceNumber, parsePagination, getPaginationMeta } from '../utils/helpers';

const router = Router();
const prisma = new PrismaClient();

// GET /api/invoices - Get all invoices
router.get(
  '/',
  authenticate,
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

// GET /api/invoices/:id - Get invoice by ID
router.get(
  '/:id',
  authenticate,
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



