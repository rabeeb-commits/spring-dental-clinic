import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import { upload } from '../middleware/upload';
import path from 'path';
import fs from 'fs';

const router = Router();
const prisma = new PrismaClient();

// GET /api/documents/patient/:patientId - Get patient's documents
router.get(
  '/patient/:patientId',
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { patientId } = req.params;
      const { type } = req.query;

      const where: any = { patientId };
      if (type) where.type = type;

      const documents = await prisma.document.findMany({
        where,
        include: {
          uploadedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { uploadedAt: 'desc' },
      });

      res.json({
        success: true,
        data: documents,
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/documents/:id - Get document by ID
router.get(
  '/:id',
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      const document = await prisma.document.findUnique({
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
          uploadedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      if (!document) {
        res.status(404).json({
          success: false,
          message: 'Document not found',
        });
        return;
      }

      res.json({
        success: true,
        data: document,
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/documents/:id/download - Download document
router.get(
  '/:id/download',
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      const document = await prisma.document.findUnique({
        where: { id },
      });

      if (!document) {
        res.status(404).json({
          success: false,
          message: 'Document not found',
        });
        return;
      }

      const filePath = path.join(__dirname, '../../', document.filePath);

      if (!fs.existsSync(filePath)) {
        res.status(404).json({
          success: false,
          message: 'File not found on server',
        });
        return;
      }

      res.download(filePath, document.fileName);
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/documents - Upload document
router.post(
  '/',
  authenticate,
  upload.single('file'),
  [
    body('patientId').notEmpty().withMessage('Patient ID is required'),
    body('type')
      .isIn(['XRAY', 'SCAN', 'PRESCRIPTION', 'CONSENT_FORM', 'LAB_REPORT', 'OTHER'])
      .withMessage('Valid document type is required'),
    body('title').trim().notEmpty().withMessage('Title is required'),
  ],
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, errors: errors.array() });
        return;
      }

      if (!req.file) {
        res.status(400).json({
          success: false,
          message: 'No file uploaded',
        });
        return;
      }

      const { patientId, type, title, description, toothNumbers } = req.body;

      const document = await prisma.document.create({
        data: {
          patientId,
          type,
          title,
          description,
          fileName: req.file.originalname,
          filePath: `uploads/${patientId}/${req.file.filename}`,
          fileSize: req.file.size,
          mimeType: req.file.mimetype,
          toothNumbers: toothNumbers ? JSON.parse(toothNumbers) : [],
          uploadedById: req.user!.id,
        },
        include: {
          uploadedBy: {
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
          entityType: 'Document',
          entityId: document.id,
          description: `Uploaded document: ${document.title}`,
        },
      });

      res.status(201).json({
        success: true,
        message: 'Document uploaded successfully',
        data: document,
      });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/documents/:id - Update document metadata
router.put(
  '/:id',
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { title, description, toothNumbers, type } = req.body;

      const document = await prisma.document.update({
        where: { id },
        data: {
          ...(title && { title }),
          ...(description !== undefined && { description }),
          ...(toothNumbers !== undefined && { toothNumbers }),
          ...(type && { type }),
        },
      });

      res.json({
        success: true,
        message: 'Document updated successfully',
        data: document,
      });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/documents/:id - Delete document
router.delete(
  '/:id',
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      const document = await prisma.document.findUnique({
        where: { id },
      });

      if (!document) {
        res.status(404).json({
          success: false,
          message: 'Document not found',
        });
        return;
      }

      // Delete file from disk
      const filePath = path.join(__dirname, '../../', document.filePath);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      // Delete from database
      await prisma.document.delete({
        where: { id },
      });

      // Log activity
      await prisma.activityLog.create({
        data: {
          userId: req.user!.id,
          action: 'DELETE',
          entityType: 'Document',
          entityId: id,
          description: `Deleted document: ${document.title}`,
        },
      });

      res.json({
        success: true,
        message: 'Document deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;



