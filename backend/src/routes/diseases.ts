import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { authenticate, isDentistOrAdmin } from '../middleware/auth';
import { parsePagination, getPaginationMeta } from '../utils/helpers';

const router = Router();
const prisma = new PrismaClient();

// GET /api/diseases - Get all diseases
router.get(
  '/',
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { search, category, isActive } = req.query;

      const where: any = {};

      if (isActive !== undefined) {
        where.isActive = isActive === 'true';
      }

      if (category) {
        where.category = category;
      }

      if (search) {
        where.OR = [
          { name: { contains: search as string, mode: 'insensitive' } },
          { code: { contains: search as string, mode: 'insensitive' } },
        ];
      }

      const diseases = await prisma.disease.findMany({
        where,
        orderBy: { name: 'asc' },
      });

      res.json({
        success: true,
        data: diseases,
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/diseases/categories - Get unique categories
router.get(
  '/categories',
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const diseases = await prisma.disease.findMany({
        where: { category: { not: null } },
        select: { category: true },
        distinct: ['category'],
      });

      const categories = diseases.map((d) => d.category).filter(Boolean);

      res.json({
        success: true,
        data: categories,
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/diseases/:id - Get disease by ID
router.get(
  '/:id',
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      const disease = await prisma.disease.findUnique({
        where: { id },
      });

      if (!disease) {
        res.status(404).json({
          success: false,
          message: 'Disease not found',
        });
        return;
      }

      res.json({
        success: true,
        data: disease,
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/diseases - Create disease
router.post(
  '/',
  authenticate,
  isDentistOrAdmin,
  [
    body('name').trim().notEmpty().withMessage('Disease name is required'),
    body('code').optional().trim(),
    body('category').optional().trim(),
  ],
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, errors: errors.array() });
        return;
      }

      const { name, code, description, category } = req.body;

      // Check if disease with same name or code exists
      const existing = await prisma.disease.findFirst({
        where: {
          OR: [
            { name: { equals: name, mode: 'insensitive' } },
            ...(code ? [{ code }] : []),
          ],
        },
      });

      if (existing) {
        res.status(400).json({
          success: false,
          message: 'Disease with this name or code already exists',
        });
        return;
      }

      const disease = await prisma.disease.create({
        data: {
          name,
          code,
          description,
          category,
        },
      });

      res.status(201).json({
        success: true,
        message: 'Disease created successfully',
        data: disease,
      });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/diseases/:id - Update disease
router.put(
  '/:id',
  authenticate,
  isDentistOrAdmin,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { name, code, description, category, isActive } = req.body;

      const disease = await prisma.disease.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(code !== undefined && { code }),
          ...(description !== undefined && { description }),
          ...(category !== undefined && { category }),
          ...(isActive !== undefined && { isActive }),
        },
      });

      res.json({
        success: true,
        message: 'Disease updated successfully',
        data: disease,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============== DIAGNOSES ==============

// GET /api/diseases/diagnoses/patient/:patientId - Get patient diagnoses
router.get(
  '/diagnoses/patient/:patientId',
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { patientId } = req.params;

      const diagnoses = await prisma.diagnosis.findMany({
        where: { patientId },
        include: {
          disease: true,
          diagnosedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { diagnosedAt: 'desc' },
      });

      res.json({
        success: true,
        data: diagnoses,
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/diseases/diagnoses - Create diagnosis
router.post(
  '/diagnoses',
  authenticate,
  isDentistOrAdmin,
  [
    body('patientId').notEmpty().withMessage('Patient ID is required'),
    body('diseaseId').notEmpty().withMessage('Disease ID is required'),
  ],
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, errors: errors.array() });
        return;
      }

      const { patientId, diseaseId, toothNumbers, severity, notes } = req.body;

      const diagnosis = await prisma.diagnosis.create({
        data: {
          patientId,
          diseaseId,
          toothNumbers: toothNumbers || [],
          severity,
          notes,
          diagnosedById: req.user!.id,
        },
        include: {
          disease: true,
          diagnosedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      // Log activity
      await prisma.activityLog.create({
        data: {
          userId: req.user!.id,
          action: 'CREATE',
          entityType: 'Diagnosis',
          entityId: diagnosis.id,
          description: `Created diagnosis for patient`,
        },
      });

      res.status(201).json({
        success: true,
        message: 'Diagnosis recorded successfully',
        data: diagnosis,
      });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/diseases/diagnoses/:id - Update diagnosis
router.put(
  '/diagnoses/:id',
  authenticate,
  isDentistOrAdmin,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { toothNumbers, severity, notes } = req.body;

      const diagnosis = await prisma.diagnosis.update({
        where: { id },
        data: {
          ...(toothNumbers !== undefined && { toothNumbers }),
          ...(severity !== undefined && { severity }),
          ...(notes !== undefined && { notes }),
        },
        include: {
          disease: true,
          diagnosedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      res.json({
        success: true,
        message: 'Diagnosis updated successfully',
        data: diagnosis,
      });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/diseases/diagnoses/:id - Delete diagnosis
router.delete(
  '/diagnoses/:id',
  authenticate,
  isDentistOrAdmin,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      await prisma.diagnosis.delete({
        where: { id },
      });

      res.json({
        success: true,
        message: 'Diagnosis deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;



