import { Router } from 'express';
import multer from 'multer';
import { importCsv, getJobStatus, getImports, getImportLeads, getImportById, deleteImport } from '../controllers/import.controller';

const router = Router();
const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

router.get('/', getImports);
router.post('/', upload.single('file'), importCsv);
router.get('/:jobId', getJobStatus);
router.get('/:id/detail', getImportById);
router.get('/:id/leads', getImportLeads);
router.delete('/:id', deleteImport);

export default router;
