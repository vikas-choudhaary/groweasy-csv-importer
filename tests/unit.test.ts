import { describe, test } from 'node:test';
import assert from 'node:assert';
import { extractRecordsWithGemini } from '../server/src/services/ai-extraction.service';
import { serverSideCrmRecordSchema } from '../server/src/schemas/crm.schema';

describe('Unit Tests', () => {
  test('Gemini AI Schema Normalization', async () => {
    // 1. Valid CRM Status
    const valid = serverSideCrmRecordSchema.parse({
      name: "Test",
      crm_status: "SALE_DONE",
      data_source: "eden_park",
      created_at: "2023-01-01"
    });
    assert.strictEqual(valid.crm_status, "SALE_DONE");

    // 2. Empty string for optional fields instead of null
    assert.strictEqual(valid.email, "");

    // 3. Catches invalid crm_status and defaults to empty string
    const invalid = serverSideCrmRecordSchema.parse({
      name: "Test",
      crm_status: "INVALID_STATUS",
      data_source: "eden_park",
      created_at: "2023-01-01"
    });
    assert.strictEqual(invalid.crm_status, "");
  });
});
