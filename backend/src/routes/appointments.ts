import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import { checkPermission } from '../middleware/permissions';
import { parsePagination, getPaginationMeta, convertTo24Hour, compareTimes } from '../utils/helpers';

const router = Router();
const prisma = new PrismaClient();

// GET /api/appointments - Get all appointments
router.get(
  '/',
  authenticate,
  checkPermission('appointments', 'read'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { page, limit, skip } = parsePagination(
        req.query.page as string,
        req.query.limit as string
      );
      const { patientId, dentistId, status, type, startDate, endDate } = req.query;

      const where: any = {};

      if (patientId) where.patientId = patientId;
      if (dentistId) where.dentistId = dentistId;
      if (status) where.status = status;
      if (type) where.type = type;

      if (startDate || endDate) {
        where.appointmentDate = {};
        if (startDate) where.appointmentDate.gte = new Date(startDate as string);
        if (endDate) where.appointmentDate.lte = new Date(endDate as string);
      }

      const [appointments, total] = await Promise.all([
        prisma.appointment.findMany({
          where,
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
          },
          skip,
          take: limit,
          orderBy: [{ appointmentDate: 'desc' }, { startTime: 'asc' }],
        }),
        prisma.appointment.count({ where }),
      ]);

      res.json({
        success: true,
        data: appointments,
        meta: getPaginationMeta(total, page, limit),
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/appointments/calendar - Get appointments for calendar view
router.get(
  '/calendar',
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { startDate, endDate, dentistId } = req.query;

      if (!startDate || !endDate) {
        res.status(400).json({
          success: false,
          message: 'Start date and end date are required',
        });
        return;
      }

      const where: any = {
        appointmentDate: {
          gte: new Date(startDate as string),
          lte: new Date(endDate as string),
        },
      };

      if (dentistId) where.dentistId = dentistId;

      const appointments = await prisma.appointment.findMany({
        where,
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
        },
        orderBy: [{ appointmentDate: 'asc' }, { startTime: 'asc' }],
      });

      res.json({
        success: true,
        data: appointments,
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/appointments/today - Get today's appointments
router.get(
  '/today',
  authenticate,
  checkPermission('appointments', 'read'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { dentistId } = req.query;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const where: any = {
        appointmentDate: {
          gte: today,
          lt: tomorrow,
        },
      };

      if (dentistId) where.dentistId = dentistId;

      const appointments = await prisma.appointment.findMany({
        where,
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
        },
        orderBy: { startTime: 'asc' },
      });

      res.json({
        success: true,
        data: appointments,
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/appointments/:id - Get appointment by ID
router.get(
  '/:id',
  authenticate,
  checkPermission('appointments', 'read'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      const appointment = await prisma.appointment.findUnique({
        where: { id },
        include: {
          patient: {
            select: {
              id: true,
              patientId: true,
              firstName: true,
              lastName: true,
              phone: true,
              email: true,
            },
          },
          dentist: {
            select: {
              id: true,
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

      if (!appointment) {
        res.status(404).json({
          success: false,
          message: 'Appointment not found',
        });
        return;
      }

      res.json({
        success: true,
        data: appointment,
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/appointments - Create new appointment
router.post(
  '/',
  authenticate,
  checkPermission('appointments', 'create'),
  [
    body('patientId').notEmpty().withMessage('Patient ID is required'),
    body('dentistId').notEmpty().withMessage('Dentist ID is required'),
    body('appointmentDate').isISO8601().withMessage('Valid appointment date is required'),
    // Accept both 12-hour (h:mm AM/PM) and 24-hour (HH:MM) formats
    body('startTime')
      .matches(/^(\d{1,2}:\d{2}\s*(AM|PM)|([01]?[0-9]|2[0-3]):[0-5][0-9])$/i)
      .withMessage('Valid start time is required (h:mm AM/PM or HH:MM)'),
    body('endTime')
      .matches(/^(\d{1,2}:\d{2}\s*(AM|PM)|([01]?[0-9]|2[0-3]):[0-5][0-9])$/i)
      .withMessage('Valid end time is required (h:mm AM/PM or HH:MM)'),
    body('type').optional().isIn(['CONSULTATION', 'FOLLOW_UP', 'EMERGENCY', 'PROCEDURE']).withMessage('Invalid appointment type'),
  ],
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, errors: errors.array() });
        return;
      }

      const {
        patientId,
        dentistId,
        appointmentDate,
        startTime: startTimeInput,
        endTime: endTimeInput,
        type,
        reason,
        notes,
        toothNumbers,
      } = req.body;

      // Convert times to 24-hour format for storage and comparison
      let startTime: string;
      let endTime: string;
      
      try {
        startTime = convertTo24Hour(startTimeInput);
        endTime = convertTo24Hour(endTimeInput);
      } catch (error) {
        res.status(400).json({
          success: false,
          message: error instanceof Error ? error.message : 'Invalid time format',
        });
        return;
      }

      // Validate that end time is after start time
      if (compareTimes(endTime, startTime) <= 0) {
        res.status(400).json({
          success: false,
          message: 'End time must be after start time',
        });
        return;
      }

      // Validate tooth numbers if provided
      if (toothNumbers && Array.isArray(toothNumbers)) {
        const validTeeth = [11, 12, 13, 14, 15, 16, 17, 18, 21, 22, 23, 24, 25, 26, 27, 28, 31, 32, 33, 34, 35, 36, 37, 38, 41, 42, 43, 44, 45, 46, 47, 48];
        const invalidTeeth = toothNumbers.filter((t: number) => !validTeeth.includes(t));
        if (invalidTeeth.length > 0) {
          res.status(400).json({
            success: false,
            message: `Invalid tooth numbers: ${invalidTeeth.join(', ')}. Valid range is 11-48 (FDI notation).`,
          });
          return;
        }
      }

      // Check for conflicts
      const existingAppointment = await prisma.appointment.findFirst({
        where: {
          dentistId,
          appointmentDate: new Date(appointmentDate),
          status: { notIn: ['CANCELLED'] },
          OR: [
            {
              AND: [
                { startTime: { lte: startTime } },
                { endTime: { gt: startTime } },
              ],
            },
            {
              AND: [
                { startTime: { lt: endTime } },
                { endTime: { gte: endTime } },
              ],
            },
            {
              AND: [
                { startTime: { gte: startTime } },
                { endTime: { lte: endTime } },
              ],
            },
          ],
        },
      });

      if (existingAppointment) {
        res.status(400).json({
          success: false,
          message: 'Time slot conflicts with an existing appointment',
        });
        return;
      }

      const appointment = await prisma.appointment.create({
        data: {
          patientId,
          dentistId,
          appointmentDate: new Date(appointmentDate),
          startTime,
          endTime,
          type: type || 'CONSULTATION',
          reason,
          notes,
          toothNumbers: toothNumbers && Array.isArray(toothNumbers) ? toothNumbers : [],
          createdById: req.user!.id,
        },
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
        },
      });

      // Log activity
      await prisma.activityLog.create({
        data: {
          userId: req.user!.id,
          action: 'CREATE',
          entityType: 'Appointment',
          entityId: appointment.id,
          description: `Created appointment for ${appointment.patient.firstName} ${appointment.patient.lastName}`,
        },
      });

      res.status(201).json({
        success: true,
        message: 'Appointment created successfully',
        data: appointment,
      });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/appointments/:id - Update appointment
router.put(
  '/:id',
  authenticate,
  checkPermission('appointments', 'update'),
  [
    body('appointmentDate').optional().isISO8601().withMessage('Valid appointment date is required'),
    // Accept both 12-hour (h:mm AM/PM) and 24-hour (HH:MM) formats
    body('startTime')
      .optional()
      .matches(/^(\d{1,2}:\d{2}\s*(AM|PM)|([01]?[0-9]|2[0-3]):[0-5][0-9])$/i)
      .withMessage('Valid start time is required (h:mm AM/PM or HH:MM)'),
    body('endTime')
      .optional()
      .matches(/^(\d{1,2}:\d{2}\s*(AM|PM)|([01]?[0-9]|2[0-3]):[0-5][0-9])$/i)
      .withMessage('Valid end time is required (h:mm AM/PM or HH:MM)'),
    body('status').optional().isIn(['CONFIRMED', 'RESCHEDULED', 'CANCELLED', 'COMPLETED', 'NO_SHOW']).withMessage('Invalid status'),
    body('type').optional().isIn(['CONSULTATION', 'FOLLOW_UP', 'EMERGENCY', 'PROCEDURE']).withMessage('Invalid appointment type'),
  ],
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, errors: errors.array() });
        return;
      }

      const { id } = req.params;
      const updateData: any = { ...req.body };

      if (updateData.appointmentDate) {
        updateData.appointmentDate = new Date(updateData.appointmentDate);
      }

      // Convert times to 24-hour format if provided
      if (updateData.startTime) {
        try {
          updateData.startTime = convertTo24Hour(updateData.startTime);
        } catch (error) {
          res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : 'Invalid start time format',
          });
          return;
        }
      }

      if (updateData.endTime) {
        try {
          updateData.endTime = convertTo24Hour(updateData.endTime);
        } catch (error) {
          res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : 'Invalid end time format',
          });
          return;
        }
      }

      // If both times are provided, validate endTime > startTime
      if (updateData.startTime && updateData.endTime) {
        if (compareTimes(updateData.endTime, updateData.startTime) <= 0) {
          res.status(400).json({
            success: false,
            message: 'End time must be after start time',
          });
          return;
        }
      } else if (updateData.startTime || updateData.endTime) {
        // If only one time is provided, get the other from existing appointment
        const existingAppointment = await prisma.appointment.findUnique({
          where: { id },
          select: { startTime: true, endTime: true },
        });

        if (!existingAppointment) {
          res.status(404).json({
            success: false,
            message: 'Appointment not found',
          });
          return;
        }

        const startTime = updateData.startTime || existingAppointment.startTime;
        const endTime = updateData.endTime || existingAppointment.endTime;

        if (compareTimes(endTime, startTime) <= 0) {
          res.status(400).json({
            success: false,
            message: 'End time must be after start time',
          });
          return;
        }
      }

      // Validate tooth numbers if provided
      if (updateData.toothNumbers && Array.isArray(updateData.toothNumbers)) {
        const validTeeth = [11, 12, 13, 14, 15, 16, 17, 18, 21, 22, 23, 24, 25, 26, 27, 28, 31, 32, 33, 34, 35, 36, 37, 38, 41, 42, 43, 44, 45, 46, 47, 48];
        const invalidTeeth = updateData.toothNumbers.filter((t: number) => !validTeeth.includes(t));
        if (invalidTeeth.length > 0) {
          res.status(400).json({
            success: false,
            message: `Invalid tooth numbers: ${invalidTeeth.join(', ')}. Valid range is 11-48 (FDI notation).`,
          });
          return;
        }
      }

      const appointment = await prisma.appointment.update({
        where: { id },
        data: updateData,
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
        },
      });

      res.json({
        success: true,
        message: 'Appointment updated successfully',
        data: appointment,
      });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/appointments/:id/status - Update appointment status
router.put(
  '/:id/status',
  authenticate,
  checkPermission('appointments', 'update'),
  [
    body('status')
      .isIn(['CONFIRMED', 'RESCHEDULED', 'CANCELLED', 'COMPLETED', 'NO_SHOW'])
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

      const appointment = await prisma.appointment.update({
        where: { id },
        data: { status },
      });

      res.json({
        success: true,
        message: `Appointment marked as ${status}`,
        data: appointment,
      });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/appointments/:id - Cancel appointment
router.delete(
  '/:id',
  authenticate,
  checkPermission('appointments', 'delete'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      await prisma.appointment.update({
        where: { id },
        data: { status: 'CANCELLED' },
      });

      res.json({
        success: true,
        message: 'Appointment cancelled successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;



