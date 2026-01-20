import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, isAdmin } from '../middleware/auth';
import { upload } from '../middleware/upload';
import path from 'path';
import fs from 'fs';

const router = Router();
const prisma = new PrismaClient();

// POST /api/settings/logo - Upload clinic logo
router.post(
  '/logo',
  authenticate,
  isAdmin,
  upload.single('logo'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          message: 'No file uploaded',
        });
        return;
      }

      // Validate file type (images only)
      const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedMimeTypes.includes(req.file.mimetype)) {
        // Delete uploaded file if invalid
        fs.unlinkSync(req.file.path);
        res.status(400).json({
          success: false,
          message: 'Invalid file type. Only image files (JPG, PNG, GIF, WebP) are allowed.',
        });
        return;
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (req.file.size > maxSize) {
        // Delete uploaded file if too large
        fs.unlinkSync(req.file.path);
        res.status(400).json({
          success: false,
          message: 'File size exceeds 5MB limit. Please upload a smaller image.',
        });
        return;
      }

      // Ensure clinic directory exists
      const clinicDir = path.join(__dirname, '../../uploads/clinic');
      if (!fs.existsSync(clinicDir)) {
        fs.mkdirSync(clinicDir, { recursive: true });
      }

      // Move file to clinic directory if it's not already there
      const clinicLogoPath = path.join(clinicDir, req.file.filename);
      if (req.file.path !== clinicLogoPath) {
        // If file was uploaded to a different location, move it
        if (fs.existsSync(req.file.path)) {
          fs.renameSync(req.file.path, clinicLogoPath);
        }
      }

      // Delete old clinic logo if exists (optional cleanup)
      // For now, we'll keep all uploaded logos and let user manage them

      const logoPath = `/uploads/clinic/${req.file.filename}`;

      // Log activity
      await prisma.activityLog.create({
        data: {
          userId: req.user!.id,
          action: 'UPDATE',
          entityType: 'Settings',
          description: 'Uploaded clinic logo',
        },
      });

      res.json({
        success: true,
        message: 'Logo uploaded successfully',
        data: {
          logoPath,
          fileName: req.file.originalname,
          fileSize: req.file.size,
        },
      });
    } catch (error) {
      // Clean up uploaded file on error
      if (req.file && fs.existsSync(req.file.path)) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (unlinkError) {
          // Ignore cleanup errors
        }
      }
      next(error);
    }
  }
);

// DELETE /api/settings/logo - Remove clinic logo
router.delete(
  '/logo',
  authenticate,
  isAdmin,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { logoPath } = req.body;

      if (logoPath && logoPath.startsWith('/uploads/clinic/')) {
        const filePath = path.join(__dirname, '../../', logoPath);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }

      // Log activity
      await prisma.activityLog.create({
        data: {
          userId: req.user!.id,
          action: 'UPDATE',
          entityType: 'Settings',
          description: 'Removed clinic logo',
        },
      });

      res.json({
        success: true,
        message: 'Logo removed successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
