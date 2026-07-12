import { Router } from 'express';
import multer from 'multer';
import { importCsv, getJobStatus } from '../controllers/import.controller';

const router = Router();
const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

// Active routes for privacy-safe public demo
router.post('/', upload.single('file'), importCsv);  // CSV upload
router.get('/:jobId', getJobStatus);                  // Job status polling

// Removed routes (privacy-safe public demo):
// - GET / (import history list)
// - GET /:id/detail (import details)
// - GET /:id/leads (import leads)
// - DELETE /:id (delete import)

export default router;
