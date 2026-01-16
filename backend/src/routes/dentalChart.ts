import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { authenticate, isDentistOrAdmin } from '../middleware/auth';
import { getAllToothNumbers } from '../utils/helpers';

const router = Router();
const prisma = new PrismaClient();

// Initialize default dental chart data
const getDefaultChartData = () => {
  const teeth: Record<number, any> = {};
  getAllToothNumbers().forEach((num) => {
    teeth[num] = {
      number: num,
      status: 'HEALTHY',
      notes: '',
      treatments: [],
      diseases: [],
    };
  });
  return { teeth, notes: '' };
};

// GET /api/dental-charts/patient/:patientId - Get patient's dental chart
router.get(
  '/patient/:patientId',
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { patientId } = req.params;

      // Get the latest dental chart for the patient
      const dentalChart = await prisma.dentalChart.findFirst({
        where: { patientId },
        orderBy: { createdAt: 'desc' },
        include: {
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      if (!dentalChart) {
        // Return default chart if none exists
        res.json({
          success: true,
          data: {
            patientId,
            chartData: getDefaultChartData(),
            version: 0,
            isNew: true,
          },
        });
        return;
      }

      res.json({
        success: true,
        data: dentalChart,
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/dental-charts/patient/:patientId/history - Get chart history
router.get(
  '/patient/:patientId/history',
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { patientId } = req.params;

      const charts = await prisma.dentalChart.findMany({
        where: { patientId },
        orderBy: { createdAt: 'desc' },
        include: {
          createdBy: {
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
        data: charts,
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/dental-charts/:id - Get dental chart by ID
router.get(
  '/:id',
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      const dentalChart = await prisma.dentalChart.findUnique({
        where: { id },
        include: {
          patient: {
            select: {
              id: true,
              patientId: true,
              firstName: true,
              lastName: true,
            },
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

      if (!dentalChart) {
        res.status(404).json({
          success: false,
          message: 'Dental chart not found',
        });
        return;
      }

      res.json({
        success: true,
        data: dentalChart,
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/dental-charts - Create or update dental chart
router.post(
  '/',
  authenticate,
  isDentistOrAdmin,
  [
    body('patientId').notEmpty().withMessage('Patient ID is required'),
    body('chartData').isObject().withMessage('Chart data is required'),
  ],
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, errors: errors.array() });
        return;
      }

      const { patientId, chartData, notes } = req.body;

      // Get current version
      const latestChart = await prisma.dentalChart.findFirst({
        where: { patientId },
        orderBy: { version: 'desc' },
      });

      const newVersion = latestChart ? latestChart.version + 1 : 1;

      // Create new chart (versioned)
      const dentalChart = await prisma.dentalChart.create({
        data: {
          patientId,
          chartData,
          notes,
          version: newVersion,
          createdById: req.user!.id,
        },
        include: {
          createdBy: {
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
          action: 'UPDATE',
          entityType: 'DentalChart',
          entityId: dentalChart.id,
          description: `Updated dental chart for patient (version ${newVersion})`,
        },
      });

      res.status(201).json({
        success: true,
        message: 'Dental chart saved successfully',
        data: dentalChart,
      });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/dental-charts/:id/tooth - Update single tooth status
router.put(
  '/:id/tooth',
  authenticate,
  isDentistOrAdmin,
  [
    body('toothNumber').isInt({ min: 11, max: 48 }).withMessage('Valid tooth number is required'),
    body('status')
      .isIn(['HEALTHY', 'CARIES', 'MISSING', 'RESTORED', 'CROWNED', 'ROOT_CANAL', 'EXTRACTED', 'IMPACTED'])
      .withMessage('Valid status is required'),
  ],
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, errors: errors.array() });
        return;
      }

      const { id } = req.params;
      const { toothNumber, status, notes, treatments, diseases } = req.body;

      const dentalChart = await prisma.dentalChart.findUnique({
        where: { id },
      });

      if (!dentalChart) {
        res.status(404).json({
          success: false,
          message: 'Dental chart not found',
        });
        return;
      }

      // Update the specific tooth in chartData
      const chartData = dentalChart.chartData as any;
      chartData.teeth[toothNumber] = {
        number: toothNumber,
        status,
        notes: notes || chartData.teeth[toothNumber]?.notes || '',
        treatments: treatments || chartData.teeth[toothNumber]?.treatments || [],
        diseases: diseases || chartData.teeth[toothNumber]?.diseases || [],
      };

      // Create new version with updated tooth
      const latestChart = await prisma.dentalChart.findFirst({
        where: { patientId: dentalChart.patientId },
        orderBy: { version: 'desc' },
      });

      const newChart = await prisma.dentalChart.create({
        data: {
          patientId: dentalChart.patientId,
          chartData,
          notes: dentalChart.notes,
          version: (latestChart?.version || 0) + 1,
          createdById: req.user!.id,
        },
      });

      res.json({
        success: true,
        message: `Tooth ${toothNumber} updated successfully`,
        data: newChart,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;



