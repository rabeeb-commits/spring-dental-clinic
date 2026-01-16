import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Validation rules
const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

const registerValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('role')
    .optional()
    .isIn(['ADMIN', 'DENTIST', 'RECEPTIONIST', 'ASSISTANT'])
    .withMessage('Invalid role'),
];

// POST /api/auth/login
router.post(
  '/login',
  loginValidation,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, errors: errors.array() });
        return;
      }

      const { email, password } = req.body;

      // Find user
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        res.status(401).json({
          success: false,
          message: 'Invalid email or password',
        });
        return;
      }

      // Check if user is active
      if (!user.isActive) {
        res.status(401).json({
          success: false,
          message: 'Account is deactivated. Please contact admin.',
        });
        return;
      }

      // Verify password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        res.status(401).json({
          success: false,
          message: 'Invalid email or password',
        });
        return;
      }

      // Generate JWT token
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET || 'default-secret',
        { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as jwt.SignOptions['expiresIn'] }
      );

      // Log activity
      await prisma.activityLog.create({
        data: {
          userId: user.id,
          action: 'LOGIN',
          entityType: 'User',
          entityId: user.id,
          description: `User ${user.email} logged in`,
        },
      });

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
          },
          token,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/auth/register
router.post(
  '/register',
  registerValidation,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, errors: errors.array() });
        return;
      }

      const { email, password, firstName, lastName, phone, role } = req.body;

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        res.status(400).json({
          success: false,
          message: 'User with this email already exists',
        });
        return;
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Create user
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          firstName,
          lastName,
          phone,
          role: role || 'RECEPTIONIST',
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          createdAt: true,
        },
      });

      // Generate JWT token
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET || 'default-secret',
        { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as jwt.SignOptions['expiresIn'] }
      );

      res.status(201).json({
        success: true,
        message: 'Registration successful',
        data: {
          user,
          token,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/auth/me - Get current user
router.get(
  '/me',
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
          createdAt: true,
        },
      });

      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found',
        });
        return;
      }

      res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/auth/change-password
router.put(
  '/change-password',
  authenticate,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 6 })
      .withMessage('New password must be at least 6 characters'),
  ],
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, errors: errors.array() });
        return;
      }

      const { currentPassword, newPassword } = req.body;

      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
      });

      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found',
        });
        return;
      }

      // Verify current password
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        res.status(400).json({
          success: false,
          message: 'Current password is incorrect',
        });
        return;
      }

      // Hash new password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);

      // Update password
      await prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      });

      res.json({
        success: true,
        message: 'Password changed successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;


