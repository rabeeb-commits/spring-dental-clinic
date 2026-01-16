import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { authenticate, isDentistOrAdmin } from '../middleware/auth';
import { parsePagination, getPaginationMeta } from '../utils/helpers';

const router = Router();
const prisma = new PrismaClient();

// GET /api/treatments - Get all treatments
router.get(
  '/',
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { page, limit, skip } = parsePagination(
        req.query.page as string,
        req.query.limit as string
      );
      const { patientId, dentistId, status, search } = req.query;

      const where: any = {};

      if (patientId) where.patientId = patientId;
      if (dentistId) where.dentistId = dentistId;
      if (status) where.status = status;

      if (search) {
        where.OR = [
          { title: { contains: search as string, mode: 'insensitive' } },
          { description: { contains: search as string, mode: 'insensitive' } },
        ];
      }

      const [treatments, total] = await Promise.all([
        prisma.treatment.findMany({
          where,
          include: {
            patient: {
              select: {
                id: true,
                patientId: true,
                firstName: true,
                lastName: true,
              },
            },
            dentist: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
            procedures: {
              include: {
                procedureType: true,
              },
            },
            invoice: {
              select: {
                id: true,
                invoiceNumber: true,
                status: true,
                totalAmount: true,
                paidAmount: true,
              },
            },
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.treatment.count({ where }),
      ]);

      res.json({
        success: true,
        data: treatments,
        meta: getPaginationMeta(total, page, limit),
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/treatments/patient/:patientId - Get patient's treatments
router.get(
  '/patient/:patientId',
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { patientId } = req.params;

      const treatments = await prisma.treatment.findMany({
        where: { patientId },
        include: {
          dentist: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          procedures: {
            include: {
              procedureType: true,
            },
          },
          invoice: {
            select: {
              id: true,
              invoiceNumber: true,
              status: true,
              totalAmount: true,
              paidAmount: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      res.json({
        success: true,
        data: treatments,
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/treatments/:id - Get treatment by ID
router.get(
  '/:id',
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      const treatment = await prisma.treatment.findUnique({
        where: { id },
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
          dentist: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          procedures: {
            include: {
              procedureType: true,
            },
            orderBy: { createdAt: 'asc' },
          },
          invoice: true,
        },
      });

      if (!treatment) {
        res.status(404).json({
          success: false,
          message: 'Treatment not found',
        });
        return;
      }

      res.json({
        success: true,
        data: treatment,
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/treatments - Create treatment
router.post(
  '/',
  authenticate,
  isDentistOrAdmin,
  [
    body('patientId').notEmpty().withMessage('Patient ID is required'),
    body('title').trim().notEmpty().withMessage('Treatment title is required'),
  ],
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, errors: errors.array() });
        return;
      }

      const { patientId, title, description, startDate, notes, procedures } = req.body;
      const dentistId = req.body.dentistId || req.user!.id;

      // Calculate total cost if procedures provided
      let totalCost = 0;
      if (procedures && procedures.length > 0) {
        for (const proc of procedures) {
          if (proc.cost) {
            totalCost += proc.cost;
          } else if (proc.procedureTypeId) {
            const procedureType = await prisma.procedureType.findUnique({
              where: { id: proc.procedureTypeId },
            });
            if (procedureType) {
              totalCost += procedureType.defaultCost;
            }
          }
        }
      }

      const treatment = await prisma.treatment.create({
        data: {
          patientId,
          dentistId,
          title,
          description,
          totalCost,
          startDate: startDate ? new Date(startDate) : new Date(),
          notes,
          procedures: procedures
            ? {
                create: procedures.map((proc: any) => ({
                  procedureTypeId: proc.procedureTypeId,
                  toothNumbers: proc.toothNumbers || [],
                  cost: proc.cost || 0,
                  notes: proc.notes,
                  scheduledDate: proc.scheduledDate ? new Date(proc.scheduledDate) : null,
                })),
              }
            : undefined,
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
          dentist: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          procedures: {
            include: {
              procedureType: true,
            },
          },
        },
      });

      // Log activity
      await prisma.activityLog.create({
        data: {
          userId: req.user!.id,
          action: 'CREATE',
          entityType: 'Treatment',
          entityId: treatment.id,
          description: `Created treatment: ${treatment.title}`,
        },
      });

      res.status(201).json({
        success: true,
        message: 'Treatment plan created successfully',
        data: treatment,
      });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/treatments/:id - Update treatment
router.put(
  '/:id',
  authenticate,
  isDentistOrAdmin,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { title, description, status, totalCost, startDate, endDate, notes } = req.body;

      const treatment = await prisma.treatment.update({
        where: { id },
        data: {
          ...(title && { title }),
          ...(description !== undefined && { description }),
          ...(status && { status }),
          ...(totalCost !== undefined && { totalCost }),
          ...(startDate && { startDate: new Date(startDate) }),
          ...(endDate && { endDate: new Date(endDate) }),
          ...(notes !== undefined && { notes }),
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
          dentist: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          procedures: {
            include: {
              procedureType: true,
            },
          },
        },
      });

      res.json({
        success: true,
        message: 'Treatment updated successfully',
        data: treatment,
      });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/treatments/:id/status - Update treatment status
router.put(
  '/:id/status',
  authenticate,
  isDentistOrAdmin,
  [
    body('status')
      .isIn(['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'])
      .withMessage('Invalid status'),
  ],
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, errors: errors.array() });
        return;
      }

      const { id } = req.params;
      const { status } = req.body;

      const updateData: any = { status };

      if (status === 'COMPLETED') {
        updateData.endDate = new Date();
      }

      const treatment = await prisma.treatment.update({
        where: { id },
        data: updateData,
      });

      res.json({
        success: true,
        message: `Treatment marked as ${status}`,
        data: treatment,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============== TREATMENT PROCEDURES ==============

// POST /api/treatments/:id/procedures - Add procedure to treatment
router.post(
  '/:id/procedures',
  authenticate,
  isDentistOrAdmin,
  [
    body('procedureTypeId').notEmpty().withMessage('Procedure type ID is required'),
  ],
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, errors: errors.array() });
        return;
      }

      const { id } = req.params;
      const { procedureTypeId, toothNumbers, cost, scheduledDate, notes } = req.body;

      // Get procedure type for default cost
      let procedureCost = cost;
      if (procedureCost === undefined) {
        const procedureType = await prisma.procedureType.findUnique({
          where: { id: procedureTypeId },
        });
        procedureCost = procedureType?.defaultCost || 0;
      }

      const procedure = await prisma.treatmentProcedure.create({
        data: {
          treatmentId: id,
          procedureTypeId,
          toothNumbers: toothNumbers || [],
          cost: procedureCost,
          scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
          notes,
        },
        include: {
          procedureType: true,
        },
      });

      // Update treatment total cost
      const treatment = await prisma.treatment.findUnique({
        where: { id },
        include: { procedures: true },
      });

      if (treatment) {
        const newTotal = treatment.procedures.reduce((sum, p) => sum + p.cost, 0);
        await prisma.treatment.update({
          where: { id },
          data: { totalCost: newTotal },
        });
      }

      res.status(201).json({
        success: true,
        message: 'Procedure added successfully',
        data: procedure,
      });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/treatments/procedures/:procedureId - Update procedure
router.put(
  '/procedures/:procedureId',
  authenticate,
  isDentistOrAdmin,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { procedureId } = req.params;
      const { toothNumbers, cost, status, scheduledDate, completedDate, notes } = req.body;

      const procedure = await prisma.treatmentProcedure.update({
        where: { id: procedureId },
        data: {
          ...(toothNumbers !== undefined && { toothNumbers }),
          ...(cost !== undefined && { cost }),
          ...(status && { status }),
          ...(scheduledDate && { scheduledDate: new Date(scheduledDate) }),
          ...(completedDate && { completedDate: new Date(completedDate) }),
          ...(notes !== undefined && { notes }),
        },
        include: {
          procedureType: true,
        },
      });

      // Update treatment total cost if cost changed
      if (cost !== undefined) {
        const treatment = await prisma.treatment.findUnique({
          where: { id: procedure.treatmentId },
          include: { procedures: true },
        });

        if (treatment) {
          const newTotal = treatment.procedures.reduce((sum, p) => sum + p.cost, 0);
          await prisma.treatment.update({
            where: { id: treatment.id },
            data: { totalCost: newTotal },
          });
        }
      }

      res.json({
        success: true,
        message: 'Procedure updated successfully',
        data: procedure,
      });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/treatments/procedures/:procedureId - Remove procedure
router.delete(
  '/procedures/:procedureId',
  authenticate,
  isDentistOrAdmin,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { procedureId } = req.params;

      const procedure = await prisma.treatmentProcedure.delete({
        where: { id: procedureId },
      });

      // Update treatment total cost
      const treatment = await prisma.treatment.findUnique({
        where: { id: procedure.treatmentId },
        include: { procedures: true },
      });

      if (treatment) {
        const newTotal = treatment.procedures.reduce((sum, p) => sum + p.cost, 0);
        await prisma.treatment.update({
          where: { id: treatment.id },
          data: { totalCost: newTotal },
        });
      }

      res.json({
        success: true,
        message: 'Procedure removed successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;



