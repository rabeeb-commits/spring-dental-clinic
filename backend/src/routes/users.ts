import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize, isAdmin } from '../middleware/auth';
import { getUserPermissions, PermissionModule } from '../middleware/permissions';
import { parsePagination, getPaginationMeta } from '../utils/helpers';

const router = Router();
const prisma = new PrismaClient();

// GET /api/users - Get all users (Admin only)
router.get(
  '/',
  authenticate,
  authorize('ADMIN'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { page, limit, skip } = parsePagination(
        req.query.page as string,
        req.query.limit as string
      );
      const { role, isActive, search } = req.query;

      const where: any = {};

      if (role) {
        where.role = role;
      }

      if (isActive !== undefined) {
        where.isActive = isActive === 'true';
      }

      if (search) {
        where.OR = [
          { firstName: { contains: search as string, mode: 'insensitive' } },
          { lastName: { contains: search as string, mode: 'insensitive' } },
          { email: { contains: search as string, mode: 'insensitive' } },
        ];
      }

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            role: true,
            isActive: true,
            createdAt: true,
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.user.count({ where }),
      ]);

      res.json({
        success: true,
        data: users,
        meta: getPaginationMeta(total, page, limit),
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/users/dentists - Get all dentists
router.get(
  '/dentists',
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dentists = await prisma.user.findMany({
        where: {
          role: 'DENTIST',
          isActive: true,
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
        },
        orderBy: { firstName: 'asc' },
      });

      res.json({
        success: true,
        data: dentists,
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/users/:id - Get user by ID
router.get(
  '/:id',
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      // Only admins can view other users' details
      if (req.user!.role !== 'ADMIN' && req.user!.id !== id) {
        res.status(403).json({
          success: false,
          message: 'Access denied',
        });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
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

// POST /api/users - Create new user (Admin only)
router.post(
  '/',
  authenticate,
  authorize('ADMIN'),
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
    body('firstName').trim().notEmpty().withMessage('First name is required'),
    body('lastName').trim().notEmpty().withMessage('Last name is required'),
    body('role')
      .isIn(['ADMIN', 'DENTIST', 'RECEPTIONIST', 'ASSISTANT'])
      .withMessage('Valid role is required'),
  ],
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

      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          firstName,
          lastName,
          phone,
          role,
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
      });

      res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/users/:id - Update user
router.put(
  '/:id',
  authenticate,
  [
    body('firstName').optional().trim().notEmpty().withMessage('First name cannot be empty'),
    body('lastName').optional().trim().notEmpty().withMessage('Last name cannot be empty'),
    body('password')
      .optional()
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
    body('role')
      .optional()
      .isIn(['ADMIN', 'DENTIST', 'RECEPTIONIST', 'ASSISTANT'])
      .withMessage('Invalid role'),
  ],
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, errors: errors.array() });
        return;
      }

      const { id } = req.params;

      // Only admins can update other users
      if (req.user!.role !== 'ADMIN' && req.user!.id !== id) {
        res.status(403).json({
          success: false,
          message: 'Access denied',
        });
        return;
      }

      // Non-admins cannot change role or password
      if (req.user!.role !== 'ADMIN') {
        if (req.body.role) delete req.body.role;
        if (req.body.password) delete req.body.password;
      }

      const { firstName, lastName, phone, role, isActive, password } = req.body;

      const updateData: any = {
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(phone !== undefined && { phone }),
        ...(role && { role }),
        ...(isActive !== undefined && { isActive }),
      };

      // Hash password if provided (admin only)
      if (password && req.user!.role === 'ADMIN') {
        const salt = await bcrypt.genSalt(10);
        updateData.password = await bcrypt.hash(password, salt);
      }

      const user = await prisma.user.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
          isActive: true,
          updatedAt: true,
        },
      });

      res.json({
        success: true,
        message: 'User updated successfully',
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/users/:id - Deactivate user (Admin only)
router.delete(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      // Prevent self-deletion
      if (req.user!.id === id) {
        res.status(400).json({
          success: false,
          message: 'Cannot deactivate your own account',
        });
        return;
      }

      await prisma.user.update({
        where: { id },
        data: { isActive: false },
      });

      res.json({
        success: true,
        message: 'User deactivated successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/users/:id/permissions - Get user's permissions
router.get(
  '/:id/permissions',
  authenticate,
  isAdmin,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          role: true,
        },
      });

      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found',
        });
        return;
      }

      const permissions = await getUserPermissions(user.id, user.role);
      const permissionsArray = Object.values(permissions);

      res.json({
        success: true,
        data: permissionsArray,
      });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/users/:id/permissions - Update user's permissions
router.put(
  '/:id/permissions',
  authenticate,
  isAdmin,
  [
    body('permissions').isArray().withMessage('Permissions must be an array'),
    body('permissions.*.module').isIn(['patients', 'appointments', 'treatments', 'invoices', 'payments', 'reports', 'users', 'settings']).withMessage('Invalid module'),
    body('permissions.*.canCreate').isBoolean().withMessage('canCreate must be boolean'),
    body('permissions.*.canRead').isBoolean().withMessage('canRead must be boolean'),
    body('permissions.*.canUpdate').isBoolean().withMessage('canUpdate must be boolean'),
    body('permissions.*.canDelete').isBoolean().withMessage('canDelete must be boolean'),
  ],
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, errors: errors.array() });
        return;
      }

      const { id } = req.params;
      const { permissions } = req.body;

      const user = await prisma.user.findUnique({
        where: { id },
      });

      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found',
        });
        return;
      }

      // Delete existing permissions
      await prisma.userPermission.deleteMany({
        where: { userId: id },
      });

      // Create new permissions
      const permissionData = permissions.map((perm: any) => ({
        userId: id,
        module: perm.module as PermissionModule,
        canCreate: perm.canCreate,
        canRead: perm.canRead,
        canUpdate: perm.canUpdate,
        canDelete: perm.canDelete,
      }));

      await prisma.userPermission.createMany({
        data: permissionData,
      });

      // Log activity
      await prisma.activityLog.create({
        data: {
          userId: req.user!.id,
          action: 'UPDATE',
          entityType: 'User',
          entityId: id,
          description: `Updated permissions for user ${user.email}`,
        },
      });

      res.json({
        success: true,
        message: 'Permissions updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/users/:id/permissions/reset - Reset permissions to role defaults
router.post(
  '/:id/permissions/reset',
  authenticate,
  isAdmin,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      const user = await prisma.user.findUnique({
        where: { id },
      });

      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found',
        });
        return;
      }

      // Delete all custom permissions (will fall back to role defaults)
      await prisma.userPermission.deleteMany({
        where: { userId: id },
      });

      // Log activity
      await prisma.activityLog.create({
        data: {
          userId: req.user!.id,
          action: 'UPDATE',
          entityType: 'User',
          entityId: id,
          description: `Reset permissions to role defaults for user ${user.email}`,
        },
      });

      res.json({
        success: true,
        message: 'Permissions reset to role defaults successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;



