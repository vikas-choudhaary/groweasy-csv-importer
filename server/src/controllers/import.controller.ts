import { Request, Response } from 'express';
import { processImport } from '../services/import.service';
import fs from 'fs';
import crypto from 'crypto';
import { AppError } from '../utils/errors';
import { jobService } from '../services/jobs.service';

export const importCsv = async (req: Request, res: Response): Promise<void> => {
  try {
    console.debug('[Backend] Import request started');
    if (!req.file) {
      console.debug('[Backend] Import failed: No file uploaded');
      res.status(400).json({ success: false, error: { code: 'INVALID_CSV', message: 'No file uploaded. Please upload a CSV file.', retryable: false } });
      return;
    }

    req.on('aborted', () => {
      console.debug('[Backend] Request aborted by client, cleaning up uploaded file');
      if (req.file) {
        fs.unlink(req.file.path, () => {});
      }
    });

    if (!process.env.GEMINI_API_KEY) {
      res.status(500).json({ success: false, error: { code: 'AI_CONFIGURATION_ERROR', message: 'GEMINI_API_KEY is not configured.', retryable: false } });
      return;
    }

    const file = req.file;

    // Additional validations
    if (file.mimetype !== 'text/csv' && !file.originalname.endsWith('.csv')) {
      res.status(400).json({ success: false, error: { code: 'INVALID_CSV', message: 'Invalid format. Please upload a CSV file.', retryable: false } });
      return;
    }

    const mappingConfigStr = req.body.mappingConfig;
    let mappingConfig = null;
    if (mappingConfigStr) {
      try {
        mappingConfig = JSON.parse(mappingConfigStr);
      } catch (e) {
        console.warn('[Backend] Failed to parse mappingConfig:', e);
      }
    }

    // Guard: reject duplicate target field mappings before processing
    if (mappingConfig && Array.isArray(mappingConfig.mappings)) {
      const targetCounts: Record<string, number> = {};
      for (const m of mappingConfig.mappings) {
        if (m.targetField && m.targetField !== 'crm_note' && m.status !== 'ignored') {
          targetCounts[m.targetField] = (targetCounts[m.targetField] || 0) + 1;
        }
      }
      const duplicates = Object.entries(targetCounts)
        .filter(([, count]) => count > 1)
        .map(([field]) => field);
      if (duplicates.length > 0) {
        res.status(400).json({
          success: false,
          error: {
            code: 'DUPLICATE_TARGET_MAPPING',
            message: `Duplicate target field mappings detected: ${duplicates.join(', ')}. Each CRM field may only have one source column.`,
            retryable: false
          }
        });
        return;
      }
    }

    const jobId = crypto.randomUUID();

    // Fire and forget asynchronous processing
    console.debug(`[Backend] Job created: ${jobId}, kicking off processImport`);
    processImport(file.path, jobId, mappingConfig).catch((err) => {
      console.error(`[Backend] Async processImport failed catastrophically for job ${jobId}:`, err);
    });

    res.status(202).json({ jobId, status: 'queued' });
  } catch (error: unknown) {
    console.error('[Backend] Import Error:', error);
    
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        error: {
          code: error.code,
          message: error.message,
          retryable: error.retryable
        }
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected internal error occurred.',
        retryable: true
      }
    });
  }
};

export const getJobStatus = (req: Request, res: Response): void => {
  const jobId = Array.isArray(req.params.jobId) ? req.params.jobId[0] : req.params.jobId;
  console.debug(`[Backend] Status request for job: ${jobId}`);
  
  const job = jobService.getJob(jobId);

  if (!job) {
    console.debug(`[Backend] Job not found: ${jobId}`);
    res.status(404).json({ success: false, error: { code: 'JOB_NOT_FOUND', message: 'Job not found', retryable: false } });
    return;
  }

  res.status(200).json(job);
};

// Dead handlers removed (routes no longer exposed in privacy-safe public demo):
// - getImports
// - getImportLeads  
// - getImportById
// - deleteImport
