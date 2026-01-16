import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import ExcelJS from 'exceljs';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// GET /api/reports/dashboard - Dashboard summary
router.get(
  '/dashboard',
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

      const [
        totalPatients,
        newPatientsThisMonth,
        todaysAppointments,
        pendingAppointments,
        monthlyRevenue,
        todaysPayments,
        outstandingAmount,
        treatmentsInProgress,
      ] = await Promise.all([
        prisma.patient.count({ where: { isActive: true } }),
        prisma.patient.count({
          where: {
            createdAt: { gte: startOfMonth, lte: endOfMonth },
          },
        }),
        prisma.appointment.count({
          where: {
            appointmentDate: { gte: today, lt: tomorrow },
            status: { not: 'CANCELLED' },
          },
        }),
        prisma.appointment.count({
          where: {
            appointmentDate: { gte: today },
            status: 'CONFIRMED',
          },
        }),
        prisma.payment.aggregate({
          where: {
            paymentDate: { gte: startOfMonth, lte: endOfMonth },
          },
          _sum: { amount: true },
        }),
        prisma.payment.aggregate({
          where: {
            paymentDate: { gte: today, lt: tomorrow },
          },
          _sum: { amount: true },
        }),
        prisma.invoice.aggregate({
          where: {
            status: { in: ['PENDING', 'PARTIAL'] },
          },
          _sum: { dueAmount: true },
        }),
        prisma.treatment.count({
          where: { status: 'IN_PROGRESS' },
        }),
      ]);

      res.json({
        success: true,
        data: {
          patients: {
            total: totalPatients,
            newThisMonth: newPatientsThisMonth,
          },
          appointments: {
            today: todaysAppointments,
            pending: pendingAppointments,
          },
          revenue: {
            thisMonth: monthlyRevenue._sum.amount || 0,
            today: todaysPayments._sum.amount || 0,
            outstanding: outstandingAmount._sum.dueAmount || 0,
          },
          treatments: {
            inProgress: treatmentsInProgress,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/reports/revenue - Revenue report
router.get(
  '/revenue',
  authenticate,
  authorize('ADMIN', 'DENTIST'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { startDate, endDate, groupBy } = req.query;

      const start = startDate
        ? new Date(startDate as string)
        : new Date(new Date().getFullYear(), 0, 1);
      const end = endDate ? new Date(endDate as string) : new Date();

      // Total revenue
      const totalRevenue = await prisma.payment.aggregate({
        where: {
          paymentDate: { gte: start, lte: end },
        },
        _sum: { amount: true },
      });

      // Revenue by payment mode
      const payments = await prisma.payment.findMany({
        where: {
          paymentDate: { gte: start, lte: end },
        },
        select: {
          amount: true,
          paymentMode: true,
          paymentDate: true,
        },
      });

      const byPaymentMode: Record<string, number> = {};
      const byMonth: Record<string, number> = {};

      payments.forEach((payment) => {
        // By payment mode
        byPaymentMode[payment.paymentMode] =
          (byPaymentMode[payment.paymentMode] || 0) + payment.amount;

        // By month
        const monthKey = `${payment.paymentDate.getFullYear()}-${String(
          payment.paymentDate.getMonth() + 1
        ).padStart(2, '0')}`;
        byMonth[monthKey] = (byMonth[monthKey] || 0) + payment.amount;
      });

      // Outstanding
      const outstanding = await prisma.invoice.aggregate({
        where: {
          status: { in: ['PENDING', 'PARTIAL'] },
          createdAt: { gte: start, lte: end },
        },
        _sum: { dueAmount: true },
      });

      res.json({
        success: true,
        data: {
          totalRevenue: totalRevenue._sum.amount || 0,
          outstanding: outstanding._sum.dueAmount || 0,
          byPaymentMode,
          byMonth: Object.entries(byMonth)
            .map(([month, amount]) => ({ month, amount }))
            .sort((a, b) => a.month.localeCompare(b.month)),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/reports/treatments - Treatment report
router.get(
  '/treatments',
  authenticate,
  authorize('ADMIN', 'DENTIST'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { startDate, endDate } = req.query;

      const start = startDate
        ? new Date(startDate as string)
        : new Date(new Date().getFullYear(), 0, 1);
      const end = endDate ? new Date(endDate as string) : new Date();

      // Treatment counts by status
      const byStatus = await prisma.treatment.groupBy({
        by: ['status'],
        where: {
          createdAt: { gte: start, lte: end },
        },
        _count: true,
      });

      // Most common procedures
      const procedures = await prisma.treatmentProcedure.findMany({
        where: {
          createdAt: { gte: start, lte: end },
        },
        include: {
          procedureType: {
            select: { name: true },
          },
        },
      });

      const byProcedure: Record<string, number> = {};
      procedures.forEach((proc) => {
        const name = proc.procedureType.name;
        byProcedure[name] = (byProcedure[name] || 0) + 1;
      });

      // Total treatment value
      const totalValue = await prisma.treatment.aggregate({
        where: {
          createdAt: { gte: start, lte: end },
        },
        _sum: { totalCost: true },
        _count: true,
      });

      res.json({
        success: true,
        data: {
          totalTreatments: totalValue._count,
          totalValue: totalValue._sum.totalCost || 0,
          byStatus: byStatus.reduce((acc: any, item) => {
            acc[item.status] = item._count;
            return acc;
          }, {}),
          byProcedure: Object.entries(byProcedure)
            .map(([procedure, count]) => ({ procedure, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/reports/patients - Patient statistics
router.get(
  '/patients',
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { startDate, endDate } = req.query;

      const start = startDate
        ? new Date(startDate as string)
        : new Date(new Date().getFullYear(), 0, 1);
      const end = endDate ? new Date(endDate as string) : new Date();

      // Total patients
      const totalPatients = await prisma.patient.count({
        where: { isActive: true },
      });

      // New patients in period
      const newPatients = await prisma.patient.count({
        where: {
          createdAt: { gte: start, lte: end },
        },
      });

      // By gender
      const byGender = await prisma.patient.groupBy({
        by: ['gender'],
        where: { isActive: true },
        _count: true,
      });

      // Top visitors (most appointments)
      const topVisitors = await prisma.appointment.groupBy({
        by: ['patientId'],
        where: {
          appointmentDate: { gte: start, lte: end },
          status: 'COMPLETED',
        },
        _count: true,
        orderBy: {
          _count: {
            patientId: 'desc',
          },
        },
        take: 10,
      });

      // Get patient details for top visitors
      const topVisitorDetails = await Promise.all(
        topVisitors.map(async (v) => {
          const patient = await prisma.patient.findUnique({
            where: { id: v.patientId },
            select: { firstName: true, lastName: true, patientId: true },
          });
          return {
            patient: patient
              ? `${patient.firstName} ${patient.lastName} (${patient.patientId})`
              : 'Unknown',
            visits: v._count,
          };
        })
      );

      // New patients by month
      const patients = await prisma.patient.findMany({
        where: {
          createdAt: { gte: start, lte: end },
        },
        select: { createdAt: true },
      });

      const byMonth: Record<string, number> = {};
      patients.forEach((p) => {
        const monthKey = `${p.createdAt.getFullYear()}-${String(
          p.createdAt.getMonth() + 1
        ).padStart(2, '0')}`;
        byMonth[monthKey] = (byMonth[monthKey] || 0) + 1;
      });

      res.json({
        success: true,
        data: {
          totalPatients,
          newPatients,
          byGender: byGender.reduce((acc: any, item) => {
            acc[item.gender] = item._count;
            return acc;
          }, {}),
          topVisitors: topVisitorDetails,
          newPatientsByMonth: Object.entries(byMonth)
            .map(([month, count]) => ({ month, count }))
            .sort((a, b) => a.month.localeCompare(b.month)),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/reports/appointments - Appointment statistics
router.get(
  '/appointments',
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { startDate, endDate, dentistId } = req.query;

      const start = startDate
        ? new Date(startDate as string)
        : new Date(new Date().getFullYear(), 0, 1);
      const end = endDate ? new Date(endDate as string) : new Date();

      const where: any = {
        appointmentDate: { gte: start, lte: end },
      };

      if (dentistId) where.dentistId = dentistId;

      // By status
      const byStatus = await prisma.appointment.groupBy({
        by: ['status'],
        where,
        _count: true,
      });

      // By type
      const byType = await prisma.appointment.groupBy({
        by: ['type'],
        where,
        _count: true,
      });

      // By dentist
      const byDentist = await prisma.appointment.groupBy({
        by: ['dentistId'],
        where,
        _count: true,
      });

      const dentistDetails = await Promise.all(
        byDentist.map(async (d) => {
          const dentist = await prisma.user.findUnique({
            where: { id: d.dentistId },
            select: { firstName: true, lastName: true },
          });
          return {
            dentist: dentist ? `Dr. ${dentist.firstName} ${dentist.lastName}` : 'Unknown',
            count: d._count,
          };
        })
      );

      // Total count
      const total = await prisma.appointment.count({ where });

      res.json({
        success: true,
        data: {
          total,
          byStatus: byStatus.reduce((acc: any, item) => {
            acc[item.status] = item._count;
            return acc;
          }, {}),
          byType: byType.reduce((acc: any, item) => {
            acc[item.type] = item._count;
            return acc;
          }, {}),
          byDentist: dentistDetails,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/reports/dentist-performance - Dentist performance report
router.get(
  '/dentist-performance',
  authenticate,
  authorize('ADMIN'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { startDate, endDate } = req.query;

      const start = startDate
        ? new Date(startDate as string)
        : new Date(new Date().getFullYear(), 0, 1);
      const end = endDate ? new Date(endDate as string) : new Date();

      const dentists = await prisma.user.findMany({
        where: { role: 'DENTIST', isActive: true },
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      });

      const performance = await Promise.all(
        dentists.map(async (dentist) => {
          const [appointments, treatments, revenue] = await Promise.all([
            prisma.appointment.count({
              where: {
                dentistId: dentist.id,
                appointmentDate: { gte: start, lte: end },
                status: 'COMPLETED',
              },
            }),
            prisma.treatment.count({
              where: {
                dentistId: dentist.id,
                createdAt: { gte: start, lte: end },
                status: 'COMPLETED',
              },
            }),
            prisma.treatment.aggregate({
              where: {
                dentistId: dentist.id,
                createdAt: { gte: start, lte: end },
                status: 'COMPLETED',
              },
              _sum: { totalCost: true },
            }),
          ]);

          return {
            dentist: `Dr. ${dentist.firstName} ${dentist.lastName}`,
            dentistId: dentist.id,
            appointments,
            treatments,
            revenue: revenue._sum.totalCost || 0,
          };
        })
      );

      res.json({
        success: true,
        data: performance.sort((a, b) => b.revenue - a.revenue),
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/reports/export - Export reports to Excel
router.get(
  '/export',
  authenticate,
  authorize('ADMIN', 'DENTIST'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { type, startDate, endDate } = req.query;

      const start = startDate
        ? new Date(startDate as string)
        : new Date(new Date().getFullYear(), 0, 1);
      const end = endDate ? new Date(endDate as string) : new Date();

      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Dental Clinic Management';
      workbook.created = new Date();

      // Styles
      const headerStyle: Partial<ExcelJS.Style> = {
        font: { bold: true, color: { argb: 'FFFFFFFF' } },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0891B2' } },
        alignment: { horizontal: 'center' },
      };

      const reportType = type || 'all';

      if (reportType === 'all' || reportType === 'patients') {
        // Patients Sheet
        const patients = await prisma.patient.findMany({
          where: {
            isActive: true,
          },
          include: {
            _count: {
              select: { appointments: true, treatments: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        });

        const patientsSheet = workbook.addWorksheet('Patients');
        patientsSheet.columns = [
          { header: 'Patient ID', key: 'patientId', width: 15 },
          { header: 'First Name', key: 'firstName', width: 15 },
          { header: 'Last Name', key: 'lastName', width: 15 },
          { header: 'Gender', key: 'gender', width: 10 },
          { header: 'Date of Birth', key: 'dateOfBirth', width: 15 },
          { header: 'Phone', key: 'phone', width: 15 },
          { header: 'Email', key: 'email', width: 25 },
          { header: 'Blood Group', key: 'bloodGroup', width: 12 },
          { header: 'Appointments', key: 'appointments', width: 12 },
          { header: 'Treatments', key: 'treatments', width: 12 },
          { header: 'Created At', key: 'createdAt', width: 15 },
        ];

        // Apply header style
        patientsSheet.getRow(1).eachCell((cell: ExcelJS.Cell) => {
          cell.style = headerStyle;
        });

        patients.forEach((p) => {
          patientsSheet.addRow({
            patientId: p.patientId,
            firstName: p.firstName,
            lastName: p.lastName,
            gender: p.gender,
            dateOfBirth: p.dateOfBirth ? new Date(p.dateOfBirth).toLocaleDateString() : '',
            phone: p.phone,
            email: p.email,
            bloodGroup: p.bloodGroup,
            appointments: p._count.appointments,
            treatments: p._count.treatments,
            createdAt: new Date(p.createdAt).toLocaleDateString(),
          });
        });
      }

      if (reportType === 'all' || reportType === 'appointments') {
        // Appointments Sheet
        const appointments = await prisma.appointment.findMany({
          where: {
            appointmentDate: { gte: start, lte: end },
          },
          include: {
            patient: { select: { firstName: true, lastName: true, patientId: true } },
            dentist: { select: { firstName: true, lastName: true } },
          },
          orderBy: { appointmentDate: 'desc' },
        });

        const appointmentsSheet = workbook.addWorksheet('Appointments');
        appointmentsSheet.columns = [
          { header: 'Date', key: 'date', width: 15 },
          { header: 'Time', key: 'time', width: 12 },
          { header: 'Patient ID', key: 'patientId', width: 15 },
          { header: 'Patient Name', key: 'patientName', width: 20 },
          { header: 'Dentist', key: 'dentist', width: 20 },
          { header: 'Type', key: 'type', width: 15 },
          { header: 'Status', key: 'status', width: 12 },
          { header: 'Notes', key: 'notes', width: 30 },
        ];

        appointmentsSheet.getRow(1).eachCell((cell: ExcelJS.Cell) => {
          cell.style = headerStyle;
        });

        appointments.forEach((a) => {
          appointmentsSheet.addRow({
            date: new Date(a.appointmentDate).toLocaleDateString(),
            time: `${a.startTime} - ${a.endTime}`,
            patientId: a.patient?.patientId,
            patientName: a.patient ? `${a.patient.firstName} ${a.patient.lastName}` : '',
            dentist: a.dentist ? `Dr. ${a.dentist.firstName} ${a.dentist.lastName}` : '',
            type: a.type,
            status: a.status,
            notes: a.notes || '',
          });
        });
      }

      if (reportType === 'all' || reportType === 'treatments') {
        // Treatments Sheet
        const treatments = await prisma.treatment.findMany({
          where: {
            createdAt: { gte: start, lte: end },
          },
          include: {
            patient: { select: { firstName: true, lastName: true, patientId: true } },
            dentist: { select: { firstName: true, lastName: true } },
          },
          orderBy: { createdAt: 'desc' },
        });

        const treatmentsSheet = workbook.addWorksheet('Treatments');
        treatmentsSheet.columns = [
          { header: 'Date', key: 'date', width: 15 },
          { header: 'Patient ID', key: 'patientId', width: 15 },
          { header: 'Patient Name', key: 'patientName', width: 20 },
          { header: 'Title', key: 'title', width: 25 },
          { header: 'Dentist', key: 'dentist', width: 20 },
          { header: 'Status', key: 'status', width: 12 },
          { header: 'Total Cost', key: 'totalCost', width: 12 },
        ];

        treatmentsSheet.getRow(1).eachCell((cell: ExcelJS.Cell) => {
          cell.style = headerStyle;
        });

        treatments.forEach((t) => {
          treatmentsSheet.addRow({
            date: new Date(t.createdAt).toLocaleDateString(),
            patientId: t.patient?.patientId,
            patientName: t.patient ? `${t.patient.firstName} ${t.patient.lastName}` : '',
            title: t.title,
            dentist: t.dentist ? `Dr. ${t.dentist.firstName} ${t.dentist.lastName}` : '',
            status: t.status,
            totalCost: t.totalCost,
          });
        });

        // Add totals
        treatmentsSheet.addRow({});
        treatmentsSheet.addRow({
          title: 'TOTAL',
          totalCost: treatments.reduce((sum, t) => sum + t.totalCost, 0),
        });
      }

      if (reportType === 'all' || reportType === 'invoices') {
        // Invoices Sheet
        const invoices = await prisma.invoice.findMany({
          where: {
            createdAt: { gte: start, lte: end },
          },
          include: {
            patient: { select: { firstName: true, lastName: true, patientId: true } },
          },
          orderBy: { createdAt: 'desc' },
        });

        const invoicesSheet = workbook.addWorksheet('Invoices');
        invoicesSheet.columns = [
          { header: 'Invoice Number', key: 'invoiceNumber', width: 18 },
          { header: 'Date', key: 'date', width: 15 },
          { header: 'Patient ID', key: 'patientId', width: 15 },
          { header: 'Patient Name', key: 'patientName', width: 20 },
          { header: 'Total Amount', key: 'totalAmount', width: 15 },
          { header: 'Paid Amount', key: 'paidAmount', width: 15 },
          { header: 'Due Amount', key: 'dueAmount', width: 15 },
          { header: 'Status', key: 'status', width: 12 },
        ];

        invoicesSheet.getRow(1).eachCell((cell: ExcelJS.Cell) => {
          cell.style = headerStyle;
        });

        invoices.forEach((i) => {
          invoicesSheet.addRow({
            invoiceNumber: i.invoiceNumber,
            date: new Date(i.createdAt).toLocaleDateString(),
            patientId: i.patient?.patientId,
            patientName: i.patient ? `${i.patient.firstName} ${i.patient.lastName}` : '',
            totalAmount: i.totalAmount,
            paidAmount: i.paidAmount,
            dueAmount: i.dueAmount,
            status: i.status,
          });
        });

        // Add totals
        invoicesSheet.addRow({});
        invoicesSheet.addRow({
          invoiceNumber: 'TOTALS',
          totalAmount: invoices.reduce((sum, i) => sum + i.totalAmount, 0),
          paidAmount: invoices.reduce((sum, i) => sum + i.paidAmount, 0),
          dueAmount: invoices.reduce((sum, i) => sum + i.dueAmount, 0),
        });
      }

      if (reportType === 'all' || reportType === 'payments') {
        // Payments Sheet
        const payments = await prisma.payment.findMany({
          where: {
            paymentDate: { gte: start, lte: end },
          },
          include: {
            invoice: {
              include: {
                patient: { select: { firstName: true, lastName: true, patientId: true } },
              },
            },
          },
          orderBy: { paymentDate: 'desc' },
        });

        const paymentsSheet = workbook.addWorksheet('Payments');
        paymentsSheet.columns = [
          { header: 'Payment ID', key: 'paymentId', width: 20 },
          { header: 'Date', key: 'date', width: 15 },
          { header: 'Invoice', key: 'invoice', width: 18 },
          { header: 'Patient ID', key: 'patientId', width: 15 },
          { header: 'Patient Name', key: 'patientName', width: 20 },
          { header: 'Amount', key: 'amount', width: 12 },
          { header: 'Payment Mode', key: 'paymentMode', width: 15 },
          { header: 'Reference', key: 'reference', width: 20 },
        ];

        paymentsSheet.getRow(1).eachCell((cell: ExcelJS.Cell) => {
          cell.style = headerStyle;
        });

        payments.forEach((p) => {
          paymentsSheet.addRow({
            paymentId: p.id.substring(0, 8) + '...',
            date: new Date(p.paymentDate).toLocaleDateString(),
            invoice: p.invoice?.invoiceNumber,
            patientId: p.invoice?.patient?.patientId,
            patientName: p.invoice?.patient 
              ? `${p.invoice.patient.firstName} ${p.invoice.patient.lastName}` 
              : '',
            amount: p.amount,
            paymentMode: p.paymentMode,
            reference: p.transactionId || '',
          });
        });

        // Add totals
        paymentsSheet.addRow({});
        paymentsSheet.addRow({
          paymentId: 'TOTAL',
          amount: payments.reduce((sum, p) => sum + p.amount, 0),
        });
      }

      // Set response headers
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="dental-report-${new Date().toISOString().split('T')[0]}.xlsx"`
      );

      // Write to response
      await workbook.xlsx.write(res);
      res.end();

    } catch (error) {
      next(error);
    }
  }
);

export default router;


