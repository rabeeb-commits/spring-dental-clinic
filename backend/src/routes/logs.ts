import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import * as fs from 'fs';
import * as path from 'path';
import logger from '../utils/logger';

const router = Router();

// Log directory
const LOG_DIR = path.join(process.cwd(), 'logs');

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// GET /api/logs/list - List all log files
router.get(
  '/list',
  authenticate,
  authorize('ADMIN'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!fs.existsSync(LOG_DIR)) {
        res.json({
          success: true,
          data: [],
        });
        return;
      }

      const files = fs.readdirSync(LOG_DIR)
        .filter(f => f.endsWith('.log'))
        .map(f => {
          const filePath = path.join(LOG_DIR, f);
          const stats = fs.statSync(filePath);
          return {
            filename: f,
            size: stats.size,
            createdAt: stats.birthtime,
            modifiedAt: stats.mtime,
            type: f.startsWith('error') ? 'error' : 'info',
          };
        })
        .sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime());

      res.json({
        success: true,
        data: files,
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/logs/:filename - Read a specific log file
router.get(
  '/:filename',
  authenticate,
  authorize('ADMIN'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { filename } = req.params;
      const { lines = '100', search } = req.query;
      
      // Security: prevent path traversal
      if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
        res.status(400).json({
          success: false,
          message: 'Invalid filename',
        });
        return;
      }

      const filePath = path.join(LOG_DIR, filename);

      if (!fs.existsSync(filePath)) {
        res.status(404).json({
          success: false,
          message: 'Log file not found',
        });
        return;
      }

      // Read file content
      const content = fs.readFileSync(filePath, 'utf-8');
      let logLines = content.split('\n').filter(line => line.trim());
      
      // Filter by search term if provided
      if (search) {
        const searchTerm = (search as string).toLowerCase();
        logLines = logLines.filter(line => line.toLowerCase().includes(searchTerm));
      }

      // Get last N lines
      const limit = Math.min(parseInt(lines as string, 10) || 100, 1000);
      logLines = logLines.slice(-limit);

      // Parse log entries
      const entries = logLines.map(line => {
        // Parse timestamp, level, and message
        const match = line.match(/^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) \[(\w+)\]: (.+)$/);
        if (match) {
          return {
            timestamp: match[1],
            level: match[2],
            message: match[3],
            raw: line,
          };
        }
        return {
          timestamp: '',
          level: 'INFO',
          message: line,
          raw: line,
        };
      });

      res.json({
        success: true,
        data: {
          filename,
          entries,
          totalLines: logLines.length,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/logs/download/:filename - Download a log file
router.get(
  '/download/:filename',
  authenticate,
  authorize('ADMIN'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { filename } = req.params;
      
      // Security: prevent path traversal
      if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
        res.status(400).json({
          success: false,
          message: 'Invalid filename',
        });
        return;
      }

      const filePath = path.join(LOG_DIR, filename);

      if (!fs.existsSync(filePath)) {
        res.status(404).json({
          success: false,
          message: 'Log file not found',
        });
        return;
      }

      res.download(filePath, filename);
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/logs/:filename - Delete a log file
router.delete(
  '/:filename',
  authenticate,
  authorize('ADMIN'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { filename } = req.params;
      
      // Security: prevent path traversal
      if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
        res.status(400).json({
          success: false,
          message: 'Invalid filename',
        });
        return;
      }

      const filePath = path.join(LOG_DIR, filename);

      if (!fs.existsSync(filePath)) {
        res.status(404).json({
          success: false,
          message: 'Log file not found',
        });
        return;
      }

      fs.unlinkSync(filePath);
      
      logger.info(`Log file deleted: ${filename}`, { userId: req.user?.id });

      res.json({
        success: true,
        message: 'Log file deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/logs/clear - Clear all logs (with safety)
router.post(
  '/clear',
  authenticate,
  authorize('ADMIN'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { olderThanDays = 7 } = req.body;
      
      if (!fs.existsSync(LOG_DIR)) {
        res.json({
          success: true,
          message: 'No logs to clear',
          deletedCount: 0,
        });
        return;
      }

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
      
      const files = fs.readdirSync(LOG_DIR).filter(f => f.endsWith('.log'));
      let deletedCount = 0;

      for (const file of files) {
        const filePath = path.join(LOG_DIR, file);
        const stats = fs.statSync(filePath);
        
        if (stats.mtime < cutoffDate) {
          fs.unlinkSync(filePath);
          deletedCount++;
        }
      }

      logger.info(`Cleared ${deletedCount} old log files`, { userId: req.user?.id, olderThanDays });

      res.json({
        success: true,
        message: `Deleted ${deletedCount} log files older than ${olderThanDays} days`,
        deletedCount,
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/logs/stats - Get logging statistics
router.get(
  '/stats/summary',
  authenticate,
  authorize('ADMIN'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!fs.existsSync(LOG_DIR)) {
        res.json({
          success: true,
          data: {
            totalFiles: 0,
            totalSize: 0,
            errorFiles: 0,
            infoFiles: 0,
          },
        });
        return;
      }

      const files = fs.readdirSync(LOG_DIR).filter(f => f.endsWith('.log'));
      let totalSize = 0;
      let errorFiles = 0;
      let infoFiles = 0;

      for (const file of files) {
        const filePath = path.join(LOG_DIR, file);
        const stats = fs.statSync(filePath);
        totalSize += stats.size;
        
        if (file.startsWith('error')) {
          errorFiles++;
        } else {
          infoFiles++;
        }
      }

      // Read recent errors count from today's error log
      let recentErrorsCount = 0;
      const today = new Date().toISOString().split('T')[0];
      const errorLogPath = path.join(LOG_DIR, `error-${today}.log`);
      
      if (fs.existsSync(errorLogPath)) {
        const content = fs.readFileSync(errorLogPath, 'utf-8');
        recentErrorsCount = content.split('\n').filter(line => line.trim()).length;
      }

      res.json({
        success: true,
        data: {
          totalFiles: files.length,
          totalSize,
          totalSizeFormatted: formatBytes(totalSize),
          errorFiles,
          infoFiles,
          recentErrorsCount,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Helper function
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export default router;

