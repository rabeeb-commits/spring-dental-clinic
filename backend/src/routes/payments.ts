import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient, InvoiceStatus } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import { parsePagination, getPaginationMeta } from '../utils/helpers';

const router = Router();
const prisma = new PrismaClient();

// GET /api/payments - Get all payments
router.get(
  '/',
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { page, limit, skip } = parsePagination(
        req.query.page as string,
        req.query.limit as string
      );
      const { invoiceId, paymentMode, startDate, endDate } = req.query;

      const where: any = {};

      if (invoiceId) where.invoiceId = invoiceId;
      if (paymentMode) where.paymentMode = paymentMode;

      if (startDate || endDate) {
        where.paymentDate = {};
        if (startDate) where.paymentDate.gte = new Date(startDate as string);
        if (endDate) where.paymentDate.lte = new Date(endDate as string);
      }

      const [payments, total] = await Promise.all([
        prisma.payment.findMany({
          where,
          include: {
            invoice: {
              include: {
                patient: {
                  select: {
                    id: true,
                    patientId: true,
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
            receivedBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          skip,
          take: limit,
          orderBy: { paymentDate: 'desc' },
        }),
        prisma.payment.count({ where }),
      ]);

      res.json({
        success: true,
        data: payments,
        meta: getPaginationMeta(total, page, limit),
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/payments/today - Get today's payments
router.get(
  '/today',
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const payments = await prisma.payment.findMany({
        where: {
          paymentDate: {
            gte: today,
            lt: tomorrow,
          },
        },
        include: {
          invoice: {
            include: {
              patient: {
                select: {
                  id: true,
                  patientId: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
          receivedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { paymentDate: 'desc' },
      });

      const totalCollected = payments.reduce((sum, p) => sum + p.amount, 0);
      const byPaymentMode = payments.reduce((acc: any, p) => {
        acc[p.paymentMode] = (acc[p.paymentMode] || 0) + p.amount;
        return acc;
      }, {});

      res.json({
        success: true,
        data: {
          payments,
          summary: {
            totalCollected,
            byPaymentMode,
            count: payments.length,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/payments/:id - Get payment by ID
router.get(
  '/:id',
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      const payment = await prisma.payment.findUnique({
        where: { id },
        include: {
          invoice: {
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
          },
          receivedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      if (!payment) {
        res.status(404).json({
          success: false,
          message: 'Payment not found',
        });
        return;
      }

      res.json({
        success: true,
        data: payment,
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/payments - Create payment
router.post(
  '/',
  authenticate,
  [
    body('invoiceId').notEmpty().withMessage('Invoice ID is required'),
    body('amount').isFloat({ min: 0.01 }).withMessage('Valid amount is required'),
    body('paymentMode')
      .isIn(['CASH', 'UPI', 'CARD', 'ONLINE_WALLET', 'INSURANCE', 'BANK_TRANSFER'])
      .withMessage('Valid payment mode is required'),
  ],
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, errors: errors.array() });
        return;
      }

      const { invoiceId, amount, paymentMode, transactionId, notes } = req.body;

      // Get invoice
      const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
      });

      if (!invoice) {
        res.status(404).json({
          success: false,
          message: 'Invoice not found',
        });
        return;
      }

      if (invoice.status === 'PAID') {
        res.status(400).json({
          success: false,
          message: 'Invoice is already fully paid',
        });
        return;
      }

      if (invoice.status === 'CANCELLED') {
        res.status(400).json({
          success: false,
          message: 'Cannot add payment to cancelled invoice',
        });
        return;
      }

      if (amount > invoice.dueAmount) {
        res.status(400).json({
          success: false,
          message: `Payment amount exceeds due amount (${invoice.dueAmount})`,
        });
        return;
      }

      // Create payment
      const payment = await prisma.payment.create({
        data: {
          invoiceId,
          amount,
          paymentMode,
          transactionId,
          notes,
          receivedById: req.user!.id,
        },
        include: {
          receivedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      // Update invoice
      const newPaidAmount = invoice.paidAmount + amount;
      const newDueAmount = invoice.totalAmount - newPaidAmount;
      let newStatus: InvoiceStatus = invoice.status;

      if (newDueAmount <= 0) {
        newStatus = InvoiceStatus.PAID;
      } else if (newPaidAmount > 0) {
        newStatus = InvoiceStatus.PARTIAL;
      }

      await prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          paidAmount: newPaidAmount,
          dueAmount: newDueAmount,
          status: newStatus,
        },
      });

      // Log activity
      await prisma.activityLog.create({
        data: {
          userId: req.user!.id,
          action: 'CREATE',
          entityType: 'Payment',
          entityId: payment.id,
          description: `Received payment of ${amount} for invoice ${invoice.invoiceNumber}`,
        },
      });

      res.status(201).json({
        success: true,
        message: 'Payment recorded successfully',
        data: {
          payment,
          invoice: {
            paidAmount: newPaidAmount,
            dueAmount: newDueAmount,
            status: newStatus,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/payments/:id - Void payment (refund)
router.delete(
  '/:id',
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      const payment = await prisma.payment.findUnique({
        where: { id },
        include: { invoice: true },
      });

      if (!payment) {
        res.status(404).json({
          success: false,
          message: 'Payment not found',
        });
        return;
      }

      // Delete payment
      await prisma.payment.delete({
        where: { id },
      });

      // Update invoice
      const newPaidAmount = payment.invoice.paidAmount - payment.amount;
      const newDueAmount = payment.invoice.totalAmount - newPaidAmount;
      let newStatus = payment.invoice.status;

      if (newPaidAmount <= 0) {
        newStatus = 'PENDING';
      } else {
        newStatus = 'PARTIAL';
      }

      await prisma.invoice.update({
        where: { id: payment.invoiceId },
        data: {
          paidAmount: newPaidAmount,
          dueAmount: newDueAmount,
          status: newStatus,
        },
      });

      // Log activity
      await prisma.activityLog.create({
        data: {
          userId: req.user!.id,
          action: 'DELETE',
          entityType: 'Payment',
          entityId: id,
          description: `Voided/refunded payment of ${payment.amount}`,
        },
      });

      res.json({
        success: true,
        message: 'Payment voided successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;


