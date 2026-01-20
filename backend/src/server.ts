import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

// Import logger
import logger, { requestLogger, logError } from './utils/logger';

// Import routes
import authRoutes from './routes/auth';
import patientRoutes from './routes/patients';
import appointmentRoutes from './routes/appointments';
import dentalChartRoutes from './routes/dentalChart';
import diseaseRoutes from './routes/diseases';
import treatmentRoutes from './routes/treatments';
import invoiceRoutes from './routes/invoices';
import invoiceTemplateRoutes from './routes/invoiceTemplates';
import paymentRoutes from './routes/payments';
import reportRoutes from './routes/reports';
import documentRoutes from './routes/documents';
import userRoutes from './routes/users';
import procedureTypeRoutes from './routes/procedureTypes';
import backupRoutes from './routes/backup';
import logRoutes from './routes/logs';
import settingsRoutes from './routes/settings';

// Initialize Express app
const app: Application = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Allow inline scripts for React in production
}));

// CORS configuration
const isProduction = process.env.NODE_ENV === 'production';
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  // Add any other allowed origins
].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // In production, only allow specified origins
    if (isProduction) {
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    } else {
      // In development, allow all origins
      callback(null, true);
    }
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use(requestLogger);

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/dental-charts', dentalChartRoutes);
app.use('/api/diseases', diseaseRoutes);
app.use('/api/treatments', treatmentRoutes);
app.use('/api/procedure-types', procedureTypeRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/invoice-templates', invoiceTemplateRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/settings', settingsRoutes);

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    message: 'Dental Clinic API is running',
    timestamp: new Date().toISOString()
  });
});

// Serve frontend static files in production
if (isProduction) {
  const frontendPath = path.join(__dirname, '../../frontend/dist');
  app.use(express.static(frontendPath));
  
  // Serve React app for all non-API routes (SPA routing)
  app.get('*', (req: Request, res: Response) => {
    // Don't serve index.html for API routes
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(frontendPath, 'index.html'));
    } else {
      res.status(404).json({ 
        success: false, 
        message: 'Endpoint not found' 
      });
    }
  });
} else {
  // 404 handler for development (API routes only)
  app.use((req: Request, res: Response) => {
    logger.warn('404 - Not Found', { method: req.method, url: req.originalUrl });
    res.status(404).json({ 
      success: false, 
      message: 'Endpoint not found' 
    });
  });
}

// Global error handler
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  logError(err, {
    method: req.method,
    url: req.originalUrl,
    userId: (req as any).user?.id,
  });
  
  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
  });
});

// Start server
app.listen(PORT, () => {
  logger.info(`🦷 Dental Clinic API started`, {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
  });
  console.log(`🦷 Dental Clinic API running on port ${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
