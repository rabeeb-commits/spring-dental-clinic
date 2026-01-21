import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import { checkPermission } from '../middleware/permissions';
import { parsePagination, getPaginationMeta, convertTo24Hour, compareTimes } from '../utils/helpers';

const router = Router();
const prisma = new PrismaClient();

// Helper function to get alternative doctors available at a specific time
async function getAlternativeDoctors(
  appointmentDate: Date,
  startTime: string,
  endTime: string,
  excludeDentistId?: string
): Promise<Array<{ id: string; name: string; available: boolean }>> {
  // Get all active dentists
  const allDentists = await prisma.user.findMany({
    where: {
      role: 'DENTIST',
      isActive: true,
      ...(excludeDentistId ? { id: { not: excludeDentistId } } : {}),
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
    },
  });

  // Check availability for each dentist
  const availability = await Promise.all(
    allDentists.map(async (dentist) => {
      const conflict = await prisma.appointment.findFirst({
        where: {
          dentistId: dentist.id,
          appointmentDate,
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

      return {
        id: dentist.id,
        name: `Dr. ${dentist.firstName} ${dentist.lastName}`,
        available: !conflict,
      };
    })
  );

  return availability.filter((d) => d.available);
}

// Helper function to get available time slots for a doctor on a specific date
async function getAvailableTimeSlots(
  dentistId: string,
  appointmentDate: Date,
  requestedStartTime: string,
  requestedEndTime: string,
  excludeAppointmentId?: string
): Promise<Array<{ startTime: string; endTime: string }>> {
  // Get all appointments for this doctor on this date
  const appointments = await prisma.appointment.findMany({
    where: {
      dentistId,
      appointmentDate,
      status: { notIn: ['CANCELLED'] },
      ...(excludeAppointmentId ? { id: { not: excludeAppointmentId } } : {}),
    },
    select: {
      startTime: true,
      endTime: true,
    },
    orderBy: {
      startTime: 'asc',
    },
  });

  // Generate time slots (assuming 30-minute slots from 9 AM to 6 PM)
  const availableSlots: Array<{ startTime: string; endTime: string }> = [];
  const slotDuration = 30; // minutes
  const startHour = 9;
  const endHour = 18;

  for (let hour = startHour; hour < endHour; hour++) {
    for (let minute = 0; minute < 60; minute += slotDuration) {
      const slotStart = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      const slotEndMinute = minute + slotDuration;
      const slotEndHour = slotEndMinute >= 60 ? hour + 1 : hour;
      const slotEndMin = slotEndMinute >= 60 ? slotEndMinute - 60 : slotEndMinute;
      const slotEnd = `${slotEndHour.toString().padStart(2, '0')}:${slotEndMin.toString().padStart(2, '0')}`;

      if (slotEndHour >= endHour) break;

      // Check if this slot conflicts with any existing appointment
      const hasConflict = appointments.some((apt) => {
        return (
          (compareTimes(apt.startTime, slotStart) <= 0 && compareTimes(apt.endTime, slotStart) > 0) ||
          (compareTimes(apt.startTime, slotEnd) < 0 && compareTimes(apt.endTime, slotEnd) >= 0) ||
          (compareTimes(apt.startTime, slotStart) >= 0 && compareTimes(apt.endTime, slotEnd) <= 0)
        );
      });

      if (!hasConflict) {
        // Calculate duration of requested slot
        const [reqStartH, reqStartM] = requestedStartTime.split(':').map(Number);
        const [reqEndH, reqEndM] = requestedEndTime.split(':').map(Number);
        const reqDuration = (reqEndH * 60 + reqEndM) - (reqStartH * 60 + reqStartM);

        // Only suggest slots that can accommodate the requested duration
        const [slotStartH, slotStartM] = slotStart.split(':').map(Number);
        const [slotEndH, slotEndM] = slotEnd.split(':').map(Number);
        const slotDurationMinutes = (slotEndH * 60 + slotEndM) - (slotStartH * 60 + slotStartM);

        if (slotDurationMinutes >= reqDuration) {
          availableSlots.push({ startTime: slotStart, endTime: slotEnd });
        }
      }
    }
  }

  return availableSlots.slice(0, 5); // Return top 5 available slots
}

// Helper function to get next available time slot
async function getNextAvailableSlot(
  dentistId: string,
  appointmentDate: Date,
  requestedStartTime: string,
  requestedEndTime: string,
  excludeAppointmentId?: string
): Promise<{ startTime: string; endTime: string } | null> {
  const availableSlots = await getAvailableTimeSlots(
    dentistId,
    appointmentDate,
    requestedStartTime,
    requestedEndTime,
    excludeAppointmentId
  );

  if (availableSlots.length > 0) {
    // Find the first slot that starts after the requested time
    const [reqStartH, reqStartM] = requestedStartTime.split(':').map(Number);
    const reqStartMinutes = reqStartH * 60 + reqStartM;

    const nextSlot = availableSlots.find((slot) => {
      const [slotH, slotM] = slot.startTime.split(':').map(Number);
      const slotMinutes = slotH * 60 + slotM;
      return slotMinutes > reqStartMinutes;
    });

    return nextSlot || availableSlots[0];
  }

  return null;
}

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

// GET /api/appointments/check-availability - Check if a time slot is available
router.get(
  '/check-availability',
  authenticate,
  checkPermission('appointments', 'read'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { dentistId, appointmentDate, startTime: startTimeInput, endTime: endTimeInput, excludeAppointmentId } = req.query;

      if (!dentistId || !appointmentDate || !startTimeInput || !endTimeInput) {
        res.status(400).json({
          success: false,
          message: 'dentistId, appointmentDate, startTime, and endTime are required',
        });
        return;
      }

      // Convert times to 24-hour format
      let startTime: string;
      let endTime: string;
      
      try {
        startTime = convertTo24Hour(startTimeInput as string);
        endTime = convertTo24Hour(endTimeInput as string);
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

      const appointmentDateObj = new Date(appointmentDate as string);
      appointmentDateObj.setHours(0, 0, 0, 0);

      // Check for conflicts
      const conflictingAppointment = await prisma.appointment.findFirst({
        where: {
          dentistId: dentistId as string,
          appointmentDate: appointmentDateObj,
          status: { notIn: ['CANCELLED'] },
          ...(excludeAppointmentId ? { id: { not: excludeAppointmentId as string } } : {}),
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
        include: {
          patient: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
          dentist: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      if (conflictingAppointment) {
        // Get suggestions for alternatives
        const [alternativeDoctors, availableTimeSlots, nextAvailableSlot] = await Promise.all([
          getAlternativeDoctors(appointmentDateObj, startTime, endTime, dentistId as string),
          getAvailableTimeSlots(
            dentistId as string,
            appointmentDateObj,
            startTime,
            endTime,
            excludeAppointmentId as string | undefined
          ),
          getNextAvailableSlot(
            dentistId as string,
            appointmentDateObj,
            startTime,
            endTime,
            excludeAppointmentId as string | undefined
          ),
        ]);

        const patientName = conflictingAppointment.patient
          ? `${conflictingAppointment.patient.firstName} ${conflictingAppointment.patient.lastName}`
          : 'another patient';

        res.json({
          success: true,
          available: false,
          conflict: {
            existingAppointment: {
              patientName,
              time: `${conflictingAppointment.startTime} - ${conflictingAppointment.endTime}`,
            },
          },
          suggestions: {
            alternativeDoctors,
            availableTimeSlots,
            nextAvailableSlot,
          },
        });
      } else {
        res.json({
          success: true,
          available: true,
        });
      }
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
      const appointmentDateObj = new Date(appointmentDate);
      const existingAppointment = await prisma.appointment.findFirst({
        where: {
          dentistId,
          appointmentDate: appointmentDateObj,
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
        include: {
          patient: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
          dentist: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      if (existingAppointment) {
        // Get suggestions for alternatives
        const [alternativeDoctors, availableTimeSlots, nextAvailableSlot] = await Promise.all([
          getAlternativeDoctors(appointmentDateObj, startTime, endTime, dentistId),
          getAvailableTimeSlots(dentistId, appointmentDateObj, startTime, endTime),
          getNextAvailableSlot(dentistId, appointmentDateObj, startTime, endTime),
        ]);

        const dentistName = existingAppointment.dentist
          ? `Dr. ${existingAppointment.dentist.firstName} ${existingAppointment.dentist.lastName}`
          : 'the selected doctor';
        const patientName = existingAppointment.patient
          ? `${existingAppointment.patient.firstName} ${existingAppointment.patient.lastName}`
          : 'another patient';

        res.status(400).json({
          success: false,
          message: `This time slot is not available for ${dentistName}. ${dentistName} has an appointment with ${patientName} at ${existingAppointment.startTime} - ${existingAppointment.endTime}.`,
          conflict: {
            existingAppointment: {
              patientName,
              time: `${existingAppointment.startTime} - ${existingAppointment.endTime}`,
            },
            suggestions: {
              alternativeDoctors,
              availableTimeSlots,
              nextAvailableSlot,
            },
          },
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
      
      // Get existing appointment first to check if it exists and get current values
      const existingAppointment = await prisma.appointment.findUnique({
        where: { id },
        select: {
          dentistId: true,
          appointmentDate: true,
          startTime: true,
          endTime: true,
        },
      });

      if (!existingAppointment) {
        res.status(404).json({
          success: false,
          message: 'Appointment not found',
        });
        return;
      }

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

      // Merge existing data with updates to get final values for validation
      const finalDentistId = updateData.dentistId || existingAppointment.dentistId;
      const finalDate = updateData.appointmentDate || existingAppointment.appointmentDate;
      const finalStartTime = updateData.startTime || existingAppointment.startTime;
      const finalEndTime = updateData.endTime || existingAppointment.endTime;

      // Validate that end time is after start time
      if (compareTimes(finalEndTime, finalStartTime) <= 0) {
        res.status(400).json({
          success: false,
          message: 'End time must be after start time',
        });
        return;
      }

      // Check for conflicts if date, time, or dentist is being changed
      if (updateData.dentistId || updateData.appointmentDate || updateData.startTime || updateData.endTime) {
        const appointmentDateForQuery = finalDate instanceof Date 
          ? finalDate 
          : new Date(finalDate);

        const conflictingAppointment = await prisma.appointment.findFirst({
          where: {
            id: { not: id }, // Exclude current appointment
            dentistId: finalDentistId,
            appointmentDate: appointmentDateForQuery,
            status: { notIn: ['CANCELLED'] },
            OR: [
              {
                AND: [
                  { startTime: { lte: finalStartTime } },
                  { endTime: { gt: finalStartTime } },
                ],
              },
              {
                AND: [
                  { startTime: { lt: finalEndTime } },
                  { endTime: { gte: finalEndTime } },
                ],
              },
              {
                AND: [
                  { startTime: { gte: finalStartTime } },
                  { endTime: { lte: finalEndTime } },
                ],
              },
            ],
          },
          include: {
            patient: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
            dentist: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        });

        if (conflictingAppointment) {
          // Get suggestions for alternatives
          const [alternativeDoctors, availableTimeSlots, nextAvailableSlot] = await Promise.all([
            getAlternativeDoctors(appointmentDateForQuery, finalStartTime, finalEndTime, finalDentistId),
            getAvailableTimeSlots(finalDentistId, appointmentDateForQuery, finalStartTime, finalEndTime, id),
            getNextAvailableSlot(finalDentistId, appointmentDateForQuery, finalStartTime, finalEndTime, id),
          ]);

          const dentistName = conflictingAppointment.dentist
            ? `Dr. ${conflictingAppointment.dentist.firstName} ${conflictingAppointment.dentist.lastName}`
            : 'the selected doctor';
          const patientName = conflictingAppointment.patient
            ? `${conflictingAppointment.patient.firstName} ${conflictingAppointment.patient.lastName}`
            : 'another patient';

          res.status(400).json({
            success: false,
            message: `This time slot is not available for ${dentistName}. ${dentistName} has an appointment with ${patientName} at ${conflictingAppointment.startTime} - ${conflictingAppointment.endTime}.`,
            conflict: {
              existingAppointment: {
                patientName,
                time: `${conflictingAppointment.startTime} - ${conflictingAppointment.endTime}`,
              },
              suggestions: {
                alternativeDoctors,
                availableTimeSlots,
                nextAvailableSlot,
              },
            },
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



