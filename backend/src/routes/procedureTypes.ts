import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// GET /api/procedure-types - Get all procedure types
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

      const procedureTypes = await prisma.procedureType.findMany({
        where,
        orderBy: { name: 'asc' },
      });

      res.json({
        success: true,
        data: procedureTypes,
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/procedure-types/categories - Get unique categories
router.get(
  '/categories',
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const procedures = await prisma.procedureType.findMany({
        where: { category: { not: null } },
        select: { category: true },
        distinct: ['category'],
      });

      const categories = procedures.map((p) => p.category).filter(Boolean);

      res.json({
        success: true,
        data: categories,
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/procedure-types/:id - Get procedure type by ID
router.get(
  '/:id',
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      const procedureType = await prisma.procedureType.findUnique({
        where: { id },
      });

      if (!procedureType) {
        res.status(404).json({
          success: false,
          message: 'Procedure type not found',
        });
        return;
      }

      res.json({
        success: true,
        data: procedureType,
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/procedure-types - Create procedure type
router.post(
  '/',
  authenticate,
  authorize('ADMIN', 'DENTIST'),
  [
    body('name').trim().notEmpty().withMessage('Procedure name is required'),
    body('defaultCost').optional().isFloat({ min: 0 }).withMessage('Cost must be a positive number'),
    body('duration').optional().isInt({ min: 0 }).withMessage('Duration must be a positive number'),
  ],
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, errors: errors.array() });
        return;
      }

      const { name, code, description, defaultCost, duration, category } = req.body;

      // Check if procedure with same name or code exists
      const existing = await prisma.procedureType.findFirst({
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
          message: 'Procedure type with this name or code already exists',
        });
        return;
      }

      const procedureType = await prisma.procedureType.create({
        data: {
          name,
          code,
          description,
          defaultCost: defaultCost || 0,
          duration,
          category,
        },
      });

      res.status(201).json({
        success: true,
        message: 'Procedure type created successfully',
        data: procedureType,
      });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/procedure-types/:id - Update procedure type
router.put(
  '/:id',
  authenticate,
  authorize('ADMIN', 'DENTIST'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { name, code, description, defaultCost, duration, category, isActive } = req.body;

      const procedureType = await prisma.procedureType.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(code !== undefined && { code }),
          ...(description !== undefined && { description }),
          ...(defaultCost !== undefined && { defaultCost }),
          ...(duration !== undefined && { duration }),
          ...(category !== undefined && { category }),
          ...(isActive !== undefined && { isActive }),
        },
      });

      res.json({
        success: true,
        message: 'Procedure type updated successfully',
        data: procedureType,
      });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/procedure-types/:id - Deactivate procedure type
router.delete(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      await prisma.procedureType.update({
        where: { id },
        data: { isActive: false },
      });

      res.json({
        success: true,
        message: 'Procedure type deactivated successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;



