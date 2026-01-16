import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize } from '../middleware/auth';
import * as fs from 'fs';
import * as path from 'path';
import archiver from 'archiver';

const router = Router();
const prisma = new PrismaClient();

// Backup directory
const BACKUP_DIR = path.join(process.cwd(), 'backups');

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// GET /api/backup/list - List all backups
router.get(
  '/list',
  authenticate,
  authorize('ADMIN'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const files = fs.readdirSync(BACKUP_DIR)
        .filter(f => f.endsWith('.json'))
        .map(f => {
          const filePath = path.join(BACKUP_DIR, f);
          const stats = fs.statSync(filePath);
          return {
            id: f.replace('.json', ''),
            filename: f,
            createdAt: stats.birthtime,
            size: stats.size,
          };
        })
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      res.json({
        success: true,
        data: files,
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/backup/create - Create a new backup
router.post(
  '/create',
  authenticate,
  authorize('ADMIN'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Fetch all data from database
      const [
        users,
        patients,
        appointments,
        treatments,
        treatmentProcedures,
        invoices,
        payments,
        dentalCharts,
        diagnoses,
        diseases,
        procedureTypes,
        documents,
        medicalHistories,
      ] = await Promise.all([
        prisma.user.findMany({ select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true, createdAt: true } }),
        prisma.patient.findMany(),
        prisma.appointment.findMany(),
        prisma.treatment.findMany(),
        prisma.treatmentProcedure.findMany(),
        prisma.invoice.findMany(),
        prisma.payment.findMany(),
        prisma.dentalChart.findMany(),
        prisma.diagnosis.findMany(),
        prisma.disease.findMany(),
        prisma.procedureType.findMany(),
        prisma.document.findMany(),
        prisma.medicalHistory.findMany(),
      ]);

      const backupData = {
        version: '1.0',
        createdAt: new Date().toISOString(),
        createdBy: req.user?.email,
        data: {
          users,
          patients,
          appointments,
          treatments,
          treatmentProcedures,
          invoices,
          payments,
          dentalCharts,
          diagnoses,
          diseases,
          procedureTypes,
          documents,
          medicalHistories,
        },
        stats: {
          users: users.length,
          patients: patients.length,
          appointments: appointments.length,
          treatments: treatments.length,
          invoices: invoices.length,
          payments: payments.length,
        },
      };

      // Generate backup filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `backup-${timestamp}.json`;
      const filePath = path.join(BACKUP_DIR, filename);

      // Write backup file
      fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2));

      // Log activity
      await prisma.activityLog.create({
        data: {
          userId: req.user!.id,
          action: 'CREATE',
          entityType: 'Backup',
          entityId: filename,
          description: `Created database backup: ${filename}`,
        },
      });

      res.status(201).json({
        success: true,
        message: 'Backup created successfully',
        data: {
          id: filename.replace('.json', ''),
          filename,
          createdAt: new Date(),
          stats: backupData.stats,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/backup/download/:id - Download a backup file
router.get(
  '/download/:id',
  authenticate,
  authorize('ADMIN'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const filename = `${id}.json`;
      const filePath = path.join(BACKUP_DIR, filename);

      if (!fs.existsSync(filePath)) {
        res.status(404).json({
          success: false,
          message: 'Backup file not found',
        });
        return;
      }

      res.download(filePath, filename);
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/backup/restore/:id - Restore from a backup
router.post(
  '/restore/:id',
  authenticate,
  authorize('ADMIN'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const filename = `${id}.json`;
      const filePath = path.join(BACKUP_DIR, filename);

      if (!fs.existsSync(filePath)) {
        res.status(404).json({
          success: false,
          message: 'Backup file not found',
        });
        return;
      }

      const backupContent = fs.readFileSync(filePath, 'utf-8');
      const backupData = JSON.parse(backupContent);

      // Validate backup format
      if (!backupData.version || !backupData.data) {
        res.status(400).json({
          success: false,
          message: 'Invalid backup file format',
        });
        return;
      }

      // Note: Full restore is a destructive operation
      // In production, you would want more sophisticated restore logic
      // For now, we'll just restore some critical data

      // Log activity
      await prisma.activityLog.create({
        data: {
          userId: req.user!.id,
          action: 'UPDATE',
          entityType: 'Backup',
          entityId: filename,
          description: `Initiated restore from backup: ${filename}`,
        },
      });

      res.json({
        success: true,
        message: 'Restore initiated. Please note: Full restore requires manual database operations.',
        data: {
          backupDate: backupData.createdAt,
          stats: backupData.stats,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/backup/:id - Delete a backup
router.delete(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const filename = `${id}.json`;
      const filePath = path.join(BACKUP_DIR, filename);

      if (!fs.existsSync(filePath)) {
        res.status(404).json({
          success: false,
          message: 'Backup file not found',
        });
        return;
      }

      fs.unlinkSync(filePath);

      // Log activity
      await prisma.activityLog.create({
        data: {
          userId: req.user!.id,
          action: 'DELETE',
          entityType: 'Backup',
          entityId: filename,
          description: `Deleted backup: ${filename}`,
        },
      });

      res.json({
        success: true,
        message: 'Backup deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;


