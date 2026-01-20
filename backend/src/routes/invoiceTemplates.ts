import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { authenticate, isAdmin } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// GET /api/invoice-templates - Get all templates
router.get(
  '/',
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const templates = await prisma.invoiceTemplate.findMany({
        orderBy: [
          { isDefault: 'desc' },
          { createdAt: 'desc' },
        ],
      });

      res.json({
        success: true,
        data: templates,
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/invoice-templates/default - Get default template
router.get(
  '/default',
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      let template = await prisma.invoiceTemplate.findFirst({
        where: { isDefault: true },
      });

      // If no default template exists, create one
      if (!template) {
        template = await prisma.invoiceTemplate.create({
          data: {
            name: 'Default',
            isDefault: true,
            logoPosition: 'left',
            showClinicName: true,
            showAddress: true,
            showContact: true,
            templateStyle: 'classic',
            itemTableStyle: 'bordered',
            totalsPosition: 'right',
            showDueDate: true,
            showPaymentMethods: true,
            lateFeeEnabled: false,
            taxLabel: 'Tax',
            taxType: 'percentage',
            showTaxBreakdown: false,
            showSignature: false,
            primaryColor: '#0891b2',
            fontFamily: 'Arial, sans-serif',
          },
        });
      }

      res.json({
        success: true,
        data: template,
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/invoice-templates/:id - Get specific template
router.get(
  '/:id',
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      const template = await prisma.invoiceTemplate.findUnique({
        where: { id },
      });

      if (!template) {
        res.status(404).json({
          success: false,
          message: 'Template not found',
        });
        return;
      }

      res.json({
        success: true,
        data: template,
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/invoice-templates - Create new template
router.post(
  '/',
  authenticate,
  isAdmin,
  [
    body('name').notEmpty().withMessage('Template name is required'),
    body('templateStyle').isIn(['classic', 'modern', 'minimal']).withMessage('Invalid template style'),
    body('logoPosition').isIn(['left', 'center', 'right']).withMessage('Invalid logo position'),
    body('itemTableStyle').isIn(['bordered', 'striped', 'minimal']).withMessage('Invalid table style'),
    body('totalsPosition').isIn(['left', 'right', 'center']).withMessage('Invalid totals position'),
    body('taxType').isIn(['percentage', 'fixed']).withMessage('Invalid tax type'),
  ],
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, errors: errors.array() });
        return;
      }

      const {
        name,
        logoPosition,
        showClinicName,
        showAddress,
        showContact,
        templateStyle,
        itemTableStyle,
        totalsPosition,
        paymentTerms,
        showDueDate,
        showPaymentMethods,
        lateFeeEnabled,
        lateFeePercent,
        lateFeeDays,
        taxLabel,
        taxType,
        showTaxBreakdown,
        taxId,
        footerText,
        showSignature,
        signatureLabel,
        primaryColor,
        headerBgColor,
        footerBgColor,
        fontFamily,
      } = req.body;

      // If this is set as default, unset other defaults
      if (req.body.isDefault) {
        await prisma.invoiceTemplate.updateMany({
          where: { isDefault: true },
          data: { isDefault: false },
        });
      }

      const template = await prisma.invoiceTemplate.create({
        data: {
          name,
          isDefault: req.body.isDefault || false,
          logoPosition: logoPosition || 'left',
          showClinicName: showClinicName !== undefined ? showClinicName : true,
          showAddress: showAddress !== undefined ? showAddress : true,
          showContact: showContact !== undefined ? showContact : true,
          templateStyle: templateStyle || 'classic',
          itemTableStyle: itemTableStyle || 'bordered',
          totalsPosition: totalsPosition || 'right',
          paymentTerms,
          showDueDate: showDueDate !== undefined ? showDueDate : true,
          showPaymentMethods: showPaymentMethods !== undefined ? showPaymentMethods : true,
          lateFeeEnabled: lateFeeEnabled || false,
          lateFeePercent: lateFeePercent || 0,
          lateFeeDays: lateFeeDays || 30,
          taxLabel: taxLabel || 'Tax',
          taxType: taxType || 'percentage',
          showTaxBreakdown: showTaxBreakdown || false,
          taxId,
          footerText,
          showSignature: showSignature || false,
          signatureLabel: signatureLabel || 'Authorized Signature',
          primaryColor: primaryColor || '#0891b2',
          headerBgColor,
          footerBgColor,
          fontFamily: fontFamily || 'Arial, sans-serif',
        },
      });

      // Log activity
      await prisma.activityLog.create({
        data: {
          userId: req.user!.id,
          action: 'CREATE',
          entityType: 'InvoiceTemplate',
          entityId: template.id,
          description: `Created invoice template: ${name}`,
        },
      });

      res.status(201).json({
        success: true,
        message: 'Template created successfully',
        data: template,
      });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/invoice-templates/:id - Update template
router.put(
  '/:id',
  authenticate,
  isAdmin,
  [
    body('templateStyle').optional().isIn(['classic', 'modern', 'minimal']).withMessage('Invalid template style'),
    body('logoPosition').optional().isIn(['left', 'center', 'right']).withMessage('Invalid logo position'),
    body('itemTableStyle').optional().isIn(['bordered', 'striped', 'minimal']).withMessage('Invalid table style'),
    body('totalsPosition').optional().isIn(['left', 'right', 'center']).withMessage('Invalid totals position'),
    body('taxType').optional().isIn(['percentage', 'fixed']).withMessage('Invalid tax type'),
  ],
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ success: false, errors: errors.array() });
        return;
      }

      const { id } = req.params;

      const existingTemplate = await prisma.invoiceTemplate.findUnique({
        where: { id },
      });

      if (!existingTemplate) {
        res.status(404).json({
          success: false,
          message: 'Template not found',
        });
        return;
      }

      // If setting as default, unset other defaults
      if (req.body.isDefault && !existingTemplate.isDefault) {
        await prisma.invoiceTemplate.updateMany({
          where: { isDefault: true },
          data: { isDefault: false },
        });
      }

      const template = await prisma.invoiceTemplate.update({
        where: { id },
        data: {
          ...(req.body.name !== undefined && { name: req.body.name }),
          ...(req.body.isDefault !== undefined && { isDefault: req.body.isDefault }),
          ...(req.body.logoPosition !== undefined && { logoPosition: req.body.logoPosition }),
          ...(req.body.showClinicName !== undefined && { showClinicName: req.body.showClinicName }),
          ...(req.body.showAddress !== undefined && { showAddress: req.body.showAddress }),
          ...(req.body.showContact !== undefined && { showContact: req.body.showContact }),
          ...(req.body.templateStyle !== undefined && { templateStyle: req.body.templateStyle }),
          ...(req.body.itemTableStyle !== undefined && { itemTableStyle: req.body.itemTableStyle }),
          ...(req.body.totalsPosition !== undefined && { totalsPosition: req.body.totalsPosition }),
          ...(req.body.paymentTerms !== undefined && { paymentTerms: req.body.paymentTerms }),
          ...(req.body.showDueDate !== undefined && { showDueDate: req.body.showDueDate }),
          ...(req.body.showPaymentMethods !== undefined && { showPaymentMethods: req.body.showPaymentMethods }),
          ...(req.body.lateFeeEnabled !== undefined && { lateFeeEnabled: req.body.lateFeeEnabled }),
          ...(req.body.lateFeePercent !== undefined && { lateFeePercent: req.body.lateFeePercent }),
          ...(req.body.lateFeeDays !== undefined && { lateFeeDays: req.body.lateFeeDays }),
          ...(req.body.taxLabel !== undefined && { taxLabel: req.body.taxLabel }),
          ...(req.body.taxType !== undefined && { taxType: req.body.taxType }),
          ...(req.body.showTaxBreakdown !== undefined && { showTaxBreakdown: req.body.showTaxBreakdown }),
          ...(req.body.taxId !== undefined && { taxId: req.body.taxId }),
          ...(req.body.footerText !== undefined && { footerText: req.body.footerText }),
          ...(req.body.showSignature !== undefined && { showSignature: req.body.showSignature }),
          ...(req.body.signatureLabel !== undefined && { signatureLabel: req.body.signatureLabel }),
          ...(req.body.primaryColor !== undefined && { primaryColor: req.body.primaryColor }),
          ...(req.body.headerBgColor !== undefined && { headerBgColor: req.body.headerBgColor }),
          ...(req.body.footerBgColor !== undefined && { footerBgColor: req.body.footerBgColor }),
          ...(req.body.fontFamily !== undefined && { fontFamily: req.body.fontFamily }),
        },
      });

      // Log activity
      await prisma.activityLog.create({
        data: {
          userId: req.user!.id,
          action: 'UPDATE',
          entityType: 'InvoiceTemplate',
          entityId: id,
          description: `Updated invoice template: ${template.name}`,
        },
      });

      res.json({
        success: true,
        message: 'Template updated successfully',
        data: template,
      });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/invoice-templates/:id/set-default - Set as default
router.put(
  '/:id/set-default',
  authenticate,
  isAdmin,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      const template = await prisma.invoiceTemplate.findUnique({
        where: { id },
      });

      if (!template) {
        res.status(404).json({
          success: false,
          message: 'Template not found',
        });
        return;
      }

      // Unset all other defaults
      await prisma.invoiceTemplate.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });

      // Set this as default
      const updatedTemplate = await prisma.invoiceTemplate.update({
        where: { id },
        data: { isDefault: true },
      });

      // Log activity
      await prisma.activityLog.create({
        data: {
          userId: req.user!.id,
          action: 'UPDATE',
          entityType: 'InvoiceTemplate',
          entityId: id,
          description: `Set invoice template as default: ${updatedTemplate.name}`,
        },
      });

      res.json({
        success: true,
        message: 'Template set as default',
        data: updatedTemplate,
      });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/invoice-templates/:id - Delete template
router.delete(
  '/:id',
  authenticate,
  isAdmin,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      const template = await prisma.invoiceTemplate.findUnique({
        where: { id },
      });

      if (!template) {
        res.status(404).json({
          success: false,
          message: 'Template not found',
        });
        return;
      }

      if (template.isDefault) {
        res.status(400).json({
          success: false,
          message: 'Cannot delete default template. Set another template as default first.',
        });
        return;
      }

      await prisma.invoiceTemplate.delete({
        where: { id },
      });

      // Log activity
      await prisma.activityLog.create({
        data: {
          userId: req.user!.id,
          action: 'DELETE',
          entityType: 'InvoiceTemplate',
          entityId: id,
          description: `Deleted invoice template: ${template.name}`,
        },
      });

      res.json({
        success: true,
        message: 'Template deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
