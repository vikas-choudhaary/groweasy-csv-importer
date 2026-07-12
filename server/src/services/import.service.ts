import { parseCsvFile } from './csv.service';
import { extractRecordsWithGemini } from './ai-extraction.service';
import { withRetry } from '../utils/retry';
import { ParsedCrmRecord, SkippedRecord, ImportResponse } from '../types';
import { serverSideCrmRecordSchema } from '../schemas/crm.schema';
import { AppError } from '../utils/errors';
import { jobService } from './jobs.service';
import fs from 'fs';

function isValidDate(dateStr: string): boolean {
  if (!dateStr || typeof dateStr !== 'string') return false;
  const trimmed = dateStr.trim();
  if (!trimmed) return false;
  const date = new Date(trimmed);
  return !isNaN(date.getTime());
}

/** Basic email format check — must have local@domain.tld */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const trimmed = email.trim();
  // Must contain exactly one @, a non-empty local part, and a domain with at least one dot
  const atIdx = trimmed.indexOf('@');
  if (atIdx < 1) return false;
  const domain = trimmed.slice(atIdx + 1);
  return domain.includes('.') && domain.length > 2;
}

/** Basic mobile check — digits only (after stripping spaces/dashes), at least 7 digits */
export function isValidMobile(mobile: string): boolean {
  if (!mobile || typeof mobile !== 'string') return false;
  const digits = mobile.replace(/[\s\-\(\)\.]/g, '');
  return /^\d{7,15}$/.test(digits);
}

/**
 * Split a field value that may contain multiple comma- or semicolon-separated entries.
 * Returns an array of trimmed, non-empty strings.
 */
function splitMultiValue(value: string): string[] {
  if (!value || typeof value !== 'string') return [];
  return value
    .split(/[,;]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

/**
 * Normalizes a parsed CRM record:
 * 1. Keeps only the first valid email; appends extras to crm_note without overwriting existing note.
 * 2. Keeps only the first valid mobile; appends extras to crm_note.
 * 3. If the email field holds an invalid address, clears it (so mobile-only records still import).
 * 4. Preserves a valid source created_at; clears invalid dates (never injects current timestamp).
 */
export function normalizeRecord(record: Record<string, string>): Record<string, string> {
  const result = { ...record };
  const extraNotes: string[] = [];

  // --- Email normalization ---
  const emailCandidates = splitMultiValue(result.email || '');
  const validEmails = emailCandidates.filter(isValidEmail);
  const firstEmail = validEmails[0] || '';
  const extraEmails = validEmails.slice(1);

  result.email = firstEmail;
  if (extraEmails.length > 0) {
    extraNotes.push(`Additional emails: ${extraEmails.join(', ')}`);
  }

  // --- Mobile normalization ---
  const mobileCandidates = splitMultiValue(result.mobile_without_country_code || '');
  const validMobiles = mobileCandidates.filter(isValidMobile);
  const firstMobile = validMobiles[0] || '';
  const extraMobiles = validMobiles.slice(1);

  result.mobile_without_country_code = firstMobile;
  if (extraMobiles.length > 0) {
    extraNotes.push(`Additional mobiles: ${extraMobiles.join(', ')}`);
  }

  // --- crm_note: append extras without overwriting existing note ---
  if (extraNotes.length > 0) {
    const existing = (result.crm_note || '').trim();
    result.crm_note = existing
      ? `${existing}; ${extraNotes.join('; ')}`
      : extraNotes.join('; ');
  }

  // --- created_at: preserve valid source dates, clear invalid ones ---
  if (result.created_at && !isValidDate(result.created_at)) {
    result.created_at = '';
  }

  return result;
}

export async function processImport(filePath: string, jobId: string, mappingConfig?: Record<string, unknown>): Promise<void> {
  const startedAt = new Date().toISOString();
  const startTimeMs = Date.now();
  let fileSize = 0;
  try {
    fileSize = fs.statSync(filePath).size;
  } catch (e) {}

  let rawRecords: Record<string, unknown>[] = [];
  try {
    rawRecords = await parseCsvFile(filePath);
  } catch (err: unknown) {
    fs.unlink(filePath, () => {});
    jobService.failJob(jobId, { code: 'INVALID_CSV', message: 'Failed to parse CSV file.' });
    return;
  }
  
  const parsedRecords: ParsedCrmRecord[] = [];
  const originalRecordMap = new Map<ParsedCrmRecord, Record<string, unknown>>();
  const skippedRecords: SkippedRecord[] = [];
  
  const BATCH_SIZE = parseInt(process.env.AI_BATCH_SIZE || '25', 10);
  const batchesTotal = Math.ceil(rawRecords.length / BATCH_SIZE);
  
  jobService.createJob(jobId, rawRecords.length, batchesTotal);
  
  for (let i = 0; i < rawRecords.length; i += BATCH_SIZE) {
    const batch = rawRecords.slice(i, i + BATCH_SIZE);
    
    try {
      // Separate batch into needsGemini and deterministicOnly
      const geminiInputBatch: Record<string, unknown>[] = [];
      const recordContexts: Array<{ needsGemini: boolean; deterministicRecord: Record<string, unknown> }> = [];
      
      for (const record of batch) {
        const deterministicRecord: Record<string, unknown> = {};
        let unresolvedColumns: Record<string, unknown> = { ...record };
        let hasUnresolvedData = false;

        if (mappingConfig && mappingConfig.mappings) {
          unresolvedColumns = {};
          for (const m of (mappingConfig.mappings as Array<Record<string, unknown>>)) {
            if (m.status === 'ignored') continue;

            const sourceCol = m.sourceColumn as string;
            const targetField = m.targetField as string;
            const val = record[sourceCol];
            if (m.status === 'mapped' && m.targetField) {
              if (m.targetField === 'crm_note') {
                if (val) {
                  deterministicRecord.crm_note = deterministicRecord.crm_note ? deterministicRecord.crm_note + '; ' + val : val;
                }
              } else {
                deterministicRecord[targetField] = val;
              }
            } else {
              // Unmapped column
              unresolvedColumns[sourceCol] = val;
              if (val !== undefined && val !== null && val !== '') {
                hasUnresolvedData = true;
              }
            }
          }
          
          // Add columns that weren't in mappingConfig at all
          for (const key of Object.keys(record)) {
            if (!(mappingConfig.mappings as Array<Record<string, unknown>>).find((m) => m.sourceColumn === key)) {
              unresolvedColumns[key] = record[key];
              const val = record[key];
              if (val !== undefined && val !== null && val !== '') hasUnresolvedData = true;
            }
          }
        } else {
          // No mapping config, everything is unresolved
          hasUnresolvedData = Object.values(record).some(v => v !== undefined && v !== null && v !== '');
        }

        if (hasUnresolvedData) {
          geminiInputBatch.push(unresolvedColumns);
          recordContexts.push({ needsGemini: true, deterministicRecord });
        } else {
          recordContexts.push({ needsGemini: false, deterministicRecord });
        }
      }

      let extractedBatch: Record<string, unknown>[] = [];
      if (geminiInputBatch.length > 0) {
        extractedBatch = await withRetry(() => extractRecordsWithGemini(geminiInputBatch), 3, 1000);
      }

      let geminiIndex = 0;
      for (let j = 0; j < batch.length; j++) {
        const sourceRowIndex = i + j + 1; // 1-indexed
        const originalRecord = batch[j];
        const ctx = recordContexts[j];
        
        let rawRecord;
        if (ctx.needsGemini) {
          const geminiResult = extractedBatch[geminiIndex++];
          if (!geminiResult) {
            skippedRecords.push({ sourceRowIndex, originalRecord, reason: 'AI extraction missed this record.' });
            continue;
          }
          rawRecord = { ...geminiResult, ...ctx.deterministicRecord };
        } else {
          rawRecord = ctx.deterministicRecord;
        }
        
        if (!rawRecord) {
          skippedRecords.push({
            sourceRowIndex,
            originalRecord,
            reason: 'AI extraction missed this record.'
          });
          continue;
        }

        let parsedRaw;
        try {
          parsedRaw = serverSideCrmRecordSchema.parse(rawRecord);
        } catch (validationErr: unknown) {
          const vErr = validationErr as Error;
          skippedRecords.push({
            sourceRowIndex,
            originalRecord,
            reason: `Schema validation failed: ${vErr.message || 'Malformed AI output'}`
          });
          continue;
        }

        // Normalize: split multi-value emails/mobiles, validate formats, preserve source dates
        const record = normalizeRecord(parsedRaw as unknown as Record<string, string>);

        // Validation Rule: skip if no valid email AND no valid mobile
        const hasEmail = isValidEmail(record.email || '');
        const hasMobile = isValidMobile(record.mobile_without_country_code || '');

        if (!hasEmail && !hasMobile) {
          skippedRecords.push({
            sourceRowIndex,
            originalRecord,
            reason: 'Record lacks both a valid email and mobile number.'
          });
          continue;
        }

        parsedRecords.push(record as unknown as ParsedCrmRecord);
        originalRecordMap.set(record as unknown as ParsedCrmRecord, originalRecord);
      }
    } catch (error: unknown) {
      if (error instanceof AppError || (error as AppError)?.name === 'AppError') {
        const appErr = error as AppError;
        jobService.failJob(jobId, { code: appErr.code, message: appErr.message, retryable: appErr.retryable });
        fs.unlink(filePath, () => {});
        return;
      }

      const actualError = (error as Record<string, unknown>)?.lastError || error;
      const errorMessage = (actualError instanceof Error ? actualError.message : String(actualError)) + ' ' + ((actualError as Record<string, unknown>)?.responseBody || '');
      const statusCode = (actualError as Record<string, unknown>)?.statusCode;
      const errorMessageLower = errorMessage.toLowerCase();
      
      let code = 'UNKNOWN_ERROR';
      let userMessage = 'An unexpected error occurred during AI processing.';
      let retryable = false;

      if (statusCode === 429 || errorMessageLower.includes('429') || errorMessageLower.includes('rate limit')) {
        code = 'RATE_LIMIT';
        userMessage = 'AI processing is temporarily unavailable due to rate limits. Please try again later.';
        retryable = true;
      } else if (statusCode === 401 || statusCode === 403 || errorMessageLower.includes('401') || errorMessageLower.includes('403') || errorMessageLower.includes('api_key_invalid')) {
        code = 'AUTHENTICATION_ERROR';
        userMessage = 'AI authentication failed. Please check your API key configuration.';
        retryable = false;
      } else if (errorMessage.includes('schema') || errorMessage.includes('validation')) {
        code = 'INVALID_AI_RESPONSE';
        userMessage = 'AI response format was invalid or rejected. Check schema configuration.';
        retryable = true;
      } else if (errorMessage.toLowerCase().includes('network') || errorMessage.toLowerCase().includes('fetch')) {
        code = 'NETWORK_ERROR';
        userMessage = 'A network error occurred while communicating with the AI service.';
        retryable = true;
      } else {
        code = 'SERVER_VALIDATION_ERROR';
      }

      jobService.failJob(jobId, { code, message: userMessage, retryable });
      fs.unlink(filePath, () => {});
      return;
    }
    
    jobService.updateProgress(jobId, batch.length, 1);
  }

  const successRate = rawRecords.length > 0 ? (parsedRecords.length / rawRecords.length) : 0;

  // Duplicate detection within current CSV only (no cross-import checking in privacy-safe public demo)
  const seenEmailsInBatch = new Set<string>();
  const duplicateSkips: Array<{ record: ParsedCrmRecord; originalRecord: Record<string, unknown>; reason: string }> = [];
  const successfullyProcessed: ParsedCrmRecord[] = [];

  for (const record of parsedRecords) {
    const emailLower = (record.email || '').toLowerCase();
    const hasEmail = Boolean(record.email && typeof record.email === 'string' && record.email.trim() !== '');
    
    // Check only within current CSV upload (no database cross-import duplicate checking)
    if (hasEmail && seenEmailsInBatch.has(emailLower)) {
      const originalRec = originalRecordMap.get(record) || {};
      duplicateSkips.push({
        record,
        originalRecord: originalRec,
        reason: 'Duplicate email within the uploaded CSV file.'
      });
      continue;
    }
    
    if (hasEmail) {
      seenEmailsInBatch.add(emailLower);
    }

    successfullyProcessed.push(record);
  }

  const allSkippedRecords = [...skippedRecords, ...duplicateSkips.map(d => ({
    sourceRowIndex: -1,
    originalRecord: d.originalRecord,
    reason: d.reason
  }))];
  
  const totalImported = successfullyProcessed.length;
  const totalSkipped = allSkippedRecords.length;

  // Store results in memory only (JobService) - no SQLite persistence of customer data
  jobService.completeJob(jobId, {
    parsedRecords: successfullyProcessed,
    skippedRecords: allSkippedRecords,
    summary: {
      total: rawRecords.length,
      imported: totalImported,
      skipped: totalSkipped
    }
  });

  console.debug(`[Backend] Import ${jobId} completed: ${totalImported} imported, ${totalSkipped} skipped (${rawRecords.length} total). Results stored in-memory for 30 minutes.`);
  fs.unlink(filePath, () => {});
}
