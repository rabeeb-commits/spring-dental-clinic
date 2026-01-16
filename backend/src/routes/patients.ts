import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import PDFDocument from 'pdfkit';
import { authenticate } from '../middleware/auth';
import { generatePatientId, parsePagination, getPaginationMeta, calculateAge } from '../utils/helpers';

const router = Router();
const prisma = new PrismaClient();

// GET /api/patients - Get all patients
router.get(
  '/',
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { page, limit, skip } = parsePagination(
        req.query.page as string,
        req.query.limit as string
      );
      const { search, gender, isActive } = req.query;

      const where: any = {};

      if (isActive !== undefined) {
        where.isActive = isActive === 'true';
      }

      if (gender) {
        where.gender = gender;
      }

      if (search) {
        where.OR = [
          { firstName: { contains: search as string, mode: 'insensitive' } },
          { lastName: { contains: search as string, mode: 'insensitive' } },
          { patientId: { contains: search as string, mode: 'insensitive' } },
          { phone: { contains: search as string } },
          { email: { contains: search as string, mode: 'insensitive' } },
        ];
      }

      const [patients, total] = await Promise.all([
        prisma.patient.findMany({
          where,
          include: {
            medicalHistory: true,
            _count: {
              select: {
                appointments: true,
                treatments: true,
              },
            },
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.patient.count({ where }),
      ]);

      // Add calculated age
      const patientsWithAge = patients.map((patient) => ({
        ...patient,
        age: calculateAge(patient.dateOfBirth),
      }));

      res.json({
        success: true,
        data: patientsWithAge,
        meta: getPaginationMeta(total, page, limit),
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/patients/:id - Get patient by ID
router.get(
  '/:id',
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      const patient = await prisma.patient.findUnique({
        where: { id },
        include: {
          medicalHistory: true,
          appointments: {
            include: {
              dentist: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
            orderBy: { appointmentDate: 'desc' },
            take: 10,
          },
          treatments: {
            include: {
              dentist: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
              procedures: {
                include: {
                  procedureType: true,
                },
              },
            },
            orderBy: { createdAt: 'desc' },
          },
          dentalCharts: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          diagnoses: {
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
          },
          invoices: {
            orderBy: { createdAt: 'desc' },
            take: 5,
          },
          documents: {
            orderBy: { uploadedAt: 'desc' },
            take: 10,
          },
        },
      });

      if (!patient) {
        res.status(404).json({
          success: false,
          message: 'Patient not found',
        });
        return;
      }

      res.json({
        success: true,
        data: {
          ...patient,
          age: calculateAge(patient.dateOfBirth),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/patients - Create new patient
router.post(
  '/',
  authenticate,
  [
    body('firstName').trim().notEmpty().withMessage('First name is required'),
    body('lastName').trim().notEmpty().withMessage('Last name is required'),
    body('dateOfBirth').isISO8601().withMessage('Valid date of birth is required'),
    body('gender')
      .isIn(['MALE', 'FEMALE', 'OTHER'])
      .withMessage('Valid gender is required'),
    body('phone').notEmpty().withMessage('Phone number is required'),
    body('email').optional().isEmail().withMessage('Valid email is required'),
  ],
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, errors: errors.array() });
        return;
      }

      const {
        firstName,
        lastName,
        dateOfBirth,
        gender,
        phone,
        email,
        address,
        city,
        state,
        zipCode,
        emergencyContact,
        emergencyPhone,
        bloodGroup,
        notes,
      } = req.body;

      // Generate unique patient ID
      const patientId = await generatePatientId();

      const patient = await prisma.patient.create({
        data: {
          patientId,
          firstName,
          lastName,
          dateOfBirth: new Date(dateOfBirth),
          gender,
          phone,
          email,
          address,
          city,
          state,
          zipCode,
          emergencyContact,
          emergencyPhone,
          bloodGroup,
          notes,
          medicalHistory: {
            create: {},
          },
        },
        include: {
          medicalHistory: true,
        },
      });

      // Log activity
      await prisma.activityLog.create({
        data: {
          userId: req.user!.id,
          action: 'CREATE',
          entityType: 'Patient',
          entityId: patient.id,
          description: `Created patient: ${patient.firstName} ${patient.lastName} (${patient.patientId})`,
        },
      });

      res.status(201).json({
        success: true,
        message: 'Patient created successfully',
        data: {
          ...patient,
          age: calculateAge(patient.dateOfBirth),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/patients/:id - Update patient
router.put(
  '/:id',
  authenticate,
  [
    body('firstName').optional().trim().notEmpty().withMessage('First name cannot be empty'),
    body('lastName').optional().trim().notEmpty().withMessage('Last name cannot be empty'),
    body('dateOfBirth').optional().isISO8601().withMessage('Valid date of birth is required'),
    body('gender')
      .optional()
      .isIn(['MALE', 'FEMALE', 'OTHER'])
      .withMessage('Valid gender is required'),
    body('email').optional().isEmail().withMessage('Valid email is required'),
  ],
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, errors: errors.array() });
        return;
      }

      const { id } = req.params;
      const updateData = { ...req.body };

      if (updateData.dateOfBirth) {
        updateData.dateOfBirth = new Date(updateData.dateOfBirth);
      }

      // Remove fields that shouldn't be updated
      delete updateData.patientId;
      delete updateData.medicalHistory;

      const patient = await prisma.patient.update({
        where: { id },
        data: updateData,
        include: {
          medicalHistory: true,
        },
      });

      // Log activity
      await prisma.activityLog.create({
        data: {
          userId: req.user!.id,
          action: 'UPDATE',
          entityType: 'Patient',
          entityId: patient.id,
          description: `Updated patient: ${patient.firstName} ${patient.lastName}`,
        },
      });

      res.json({
        success: true,
        message: 'Patient updated successfully',
        data: {
          ...patient,
          age: calculateAge(patient.dateOfBirth),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/patients/:id/medical-history - Update medical history
router.put(
  '/:id/medical-history',
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const {
        allergies,
        chronicDiseases,
        currentMedications,
        previousSurgeries,
        familyHistory,
        smokingStatus,
        alcoholConsumption,
        pregnancyStatus,
      } = req.body;

      const medicalHistory = await prisma.medicalHistory.upsert({
        where: { patientId: id },
        update: {
          allergies: allergies || [],
          chronicDiseases: chronicDiseases || [],
          currentMedications: currentMedications || [],
          previousSurgeries: previousSurgeries || [],
          familyHistory,
          smokingStatus,
          alcoholConsumption,
          pregnancyStatus,
          lastUpdated: new Date(),
        },
        create: {
          patientId: id,
          allergies: allergies || [],
          chronicDiseases: chronicDiseases || [],
          currentMedications: currentMedications || [],
          previousSurgeries: previousSurgeries || [],
          familyHistory,
          smokingStatus,
          alcoholConsumption,
          pregnancyStatus,
        },
      });

      res.json({
        success: true,
        message: 'Medical history updated successfully',
        data: medicalHistory,
      });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/patients/:id - Deactivate patient
router.delete(
  '/:id',
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      await prisma.patient.update({
        where: { id },
        data: { isActive: false },
      });

      // Log activity
      await prisma.activityLog.create({
        data: {
          userId: req.user!.id,
          action: 'DELETE',
          entityType: 'Patient',
          entityId: id,
          description: `Deactivated patient`,
        },
      });

      res.json({
        success: true,
        message: 'Patient deactivated successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/patients/:id/export - Export patient to PDF
router.get(
  '/:id/export',
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      const patient = await prisma.patient.findUnique({
        where: { id },
        include: {
          medicalHistory: true,
          appointments: {
            include: {
              dentist: {
                select: { firstName: true, lastName: true },
              },
            },
            orderBy: { appointmentDate: 'desc' },
            take: 10,
          },
          treatments: {
            include: {
              dentist: {
                select: { firstName: true, lastName: true },
              },
              procedures: {
                include: {
                  procedureType: true,
                },
              },
            },
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
          invoices: {
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
        },
      });

      if (!patient) {
        res.status(404).json({
          success: false,
          message: 'Patient not found',
        });
        return;
      }

      // Create PDF document
      const doc = new PDFDocument({ margin: 50 });
      
      // Set response headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="patient-${patient.patientId}.pdf"`
      );

      // Pipe to response
      doc.pipe(res);

      // Header
      doc.fontSize(24).font('Helvetica-Bold').text('Patient Report', { align: 'center' });
      doc.moveDown();

      // Patient Information
      doc.fontSize(16).font('Helvetica-Bold').text('Patient Information');
      doc.fontSize(12).font('Helvetica');
      doc.text(`Patient ID: ${patient.patientId}`);
      doc.text(`Name: ${patient.firstName} ${patient.lastName}`);
      doc.text(`Gender: ${patient.gender || 'Not specified'}`);
      doc.text(`Date of Birth: ${patient.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString() : 'Not specified'}`);
      doc.text(`Age: ${calculateAge(patient.dateOfBirth) || 'Not specified'}`);
      doc.text(`Phone: ${patient.phone || 'Not specified'}`);
      doc.text(`Email: ${patient.email || 'Not specified'}`);
      doc.text(`Address: ${patient.address || 'Not specified'}`);
      doc.text(`Blood Group: ${patient.bloodGroup || 'Not specified'}`);
      doc.moveDown();

      // Medical History
      if (patient.medicalHistory) {
        const historyArray = Array.isArray(patient.medicalHistory) ? patient.medicalHistory : [patient.medicalHistory];
        if (historyArray.length > 0) {
          doc.fontSize(16).font('Helvetica-Bold').text('Medical History');
          doc.fontSize(12).font('Helvetica');
          
          const history = historyArray[0];
          if (history.allergies && history.allergies.length > 0) {
            doc.text(`Allergies: ${history.allergies.join(', ')}`);
          }
          if (history.chronicDiseases && history.chronicDiseases.length > 0) {
            doc.text(`Chronic Diseases: ${history.chronicDiseases.join(', ')}`);
          }
          if (history.currentMedications && history.currentMedications.length > 0) {
            doc.text(`Current Medications: ${history.currentMedications.join(', ')}`);
          }
          doc.moveDown();
        }
      }

      // Recent Appointments
      if (patient.appointments.length > 0) {
        doc.fontSize(16).font('Helvetica-Bold').text('Recent Appointments');
        doc.fontSize(10).font('Helvetica');
        
        patient.appointments.forEach((apt) => {
          const date = new Date(apt.appointmentDate).toLocaleDateString();
          const dentist = apt.dentist ? `Dr. ${apt.dentist.firstName} ${apt.dentist.lastName}` : 'N/A';
          doc.text(`${date} - ${apt.startTime} - ${apt.type} - ${dentist} - ${apt.status}`);
        });
        doc.moveDown();
      }

      // Recent Treatments
      if (patient.treatments.length > 0) {
        doc.fontSize(16).font('Helvetica-Bold').text('Recent Treatments');
        doc.fontSize(10).font('Helvetica');
        
        patient.treatments.forEach((treatment) => {
          const date = new Date(treatment.createdAt).toLocaleDateString();
          const dentist = treatment.dentist ? `Dr. ${treatment.dentist.firstName} ${treatment.dentist.lastName}` : 'N/A';
          doc.text(`${date} - ${treatment.title} - ${dentist} - ${treatment.status} - ₹${treatment.totalCost}`);
        });
        doc.moveDown();
      }

      // Recent Invoices
      if (patient.invoices.length > 0) {
        doc.fontSize(16).font('Helvetica-Bold').text('Recent Invoices');
        doc.fontSize(10).font('Helvetica');
        
        patient.invoices.forEach((invoice) => {
          const date = new Date(invoice.createdAt).toLocaleDateString();
          doc.text(`${date} - ${invoice.invoiceNumber} - ₹${invoice.totalAmount} - Paid: ₹${invoice.paidAmount} - ${invoice.status}`);
        });
        doc.moveDown();
      }

      // Footer
      doc.fontSize(8).font('Helvetica');
      doc.text(`Generated on: ${new Date().toLocaleString()}`, { align: 'center' });

      // Finalize PDF
      doc.end();

    } catch (error) {
      next(error);
    }
  }
);

export default router;


