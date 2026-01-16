import multer from 'multer';
import path from 'path';
import { Request } from 'express';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb) => {
    // Create patient-specific folder if patientId is provided
    const patientId = req.body.patientId || req.params.patientId || 'general';
    const patientDir = path.join(uploadDir, patientId);
    
    if (!fs.existsSync(patientDir)) {
      fs.mkdirSync(patientDir, { recursive: true });
    }
    
    cb(null, patientDir);
  },
  filename: (req: Request, file: Express.Multer.File, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

// File filter
const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  // Allowed file types
  const allowedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images, PDFs, and documents are allowed.'));
  }
};

// Create multer instance
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
});

// Export different upload configurations
export const uploadSingle = upload.single('file');
export const uploadMultiple = upload.array('files', 10);
export const uploadFields = upload.fields([
  { name: 'xray', maxCount: 5 },
  { name: 'scan', maxCount: 5 },
  { name: 'document', maxCount: 5 },
]);



