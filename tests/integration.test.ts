import test from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import crypto from 'crypto';
import { jobService } from '../server/src/services/jobs.service';
import db from '../server/src/utils/db';

// Must set env var before importing aiExtraction
process.env.GEMINI_API_KEY = 'dummy-test-key';

// Mocking is handled within tests using t.mock.method

async function setupTestCsv(content: string): Promise<string> {
  const path = `test-import-${crypto.randomUUID()}.csv`;
  fs.writeFileSync(path, content);
  return path;
}

test('Integration Test: Safe Fetch JSON utility (Frontend Replica)', async (t) => {
  async function safeFetchJson(response: Response | { text: () => Promise<string> }) {
    const text = await response.text();
    if (!text) return {};
    try {
      return JSON.parse(text);
    } catch {
      throw new Error("Invalid or empty JSON response from server.");
    }
  }

  await t.test('Successfully parses valid JSON', async () => {
    const res = { text: async () => '{"status":"ok"}' };
    const json = await safeFetchJson(res);
    assert.deepStrictEqual(json, { status: "ok" });
  });

  await t.test('Gracefully handles empty HTTP response', async () => {
    const res = { text: async () => '' };
    const json = await safeFetchJson(res);
    assert.deepStrictEqual(json, {});
  });

  await t.test('Gracefully handles malformed JSON response', async () => {
    const res = { text: async () => '<html>500 Internal Server Error</html>' };
    await assert.rejects(safeFetchJson(res), {
      message: 'Invalid or empty JSON response from server.'
    });
  });
});

test('Integration Test: Job Lifecycle & Polling Simulation', async (t) => {
  const { processImport } = await import('../server/src/services/import.service');
  const { jobService } = await import('../server/src/services/jobs.service');
  
  let currentFetchMock: typeof fetch;

  t.beforeEach(() => {
    currentFetchMock = async (input: RequestInfo | URL, init?: RequestInit) => {
      // Mock Gemini API success response
      return new Response(JSON.stringify({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    records: [
                      {
                        created_at: '',
                        name: 'John Doe',
                        email: 'john@example.com',
                        country_code: '+91',
                        mobile_without_country_code: '9876543210',
                        company: '',
                        city: '',
                        state: '',
                        country: '',
                        lead_owner: '',
                        crm_status: 'GOOD_LEAD_FOLLOW_UP',
                        crm_note: '',
                        data_source: 'leads_on_demand',
                        possession_time: '',
                        description: ''
                      },
                      {
                        created_at: '',
                        name: 'Jane Doe',
                        email: 'jane@example.com',
                        country_code: '+91',
                        mobile_without_country_code: '1234567890',
                        company: '',
                        city: '',
                        state: '',
                        country: '',
                        lead_owner: '',
                        crm_status: 'GOOD_LEAD_FOLLOW_UP',
                        crm_note: '',
                        data_source: 'leads_on_demand',
                        possession_time: '',
                        description: ''
                      }
                    ]
                  })
                }
              ]
            }
          }
        ]
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    };
    
    t.mock.method(global, 'fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
      return currentFetchMock(input, init);
    });
  });

  t.afterEach(() => {
    t.mock.restoreAll();
  });

  await t.test('Successful flow: Queued -> Processing -> Completed', async () => {
    const csvContent = `Name,Email,Phone\nJohn Doe,john@example.com,9876543210\nJane Doe,jane@example.com,1234567890`;
    const filePath = await setupTestCsv(csvContent);
    const jobId = 'test-job-success';

    // Fire processImport asynchronously
    const processPromise = processImport(filePath, jobId);
    
    // Wait slightly for CSV parsing to complete and job to be created
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // While processing, get job
    let job = jobService.getJob(jobId);
    assert.ok(['processing', 'completed'].includes(job?.status as string));
    assert.strictEqual(job?.totalRecords, 2);

    await processPromise;

    // After processing, get job
    job = jobService.getJob(jobId);
    assert.strictEqual(job?.status, 'completed');
    assert.strictEqual(job?.progress, 100);
    assert.strictEqual(job?.result?.parsedRecords.length, 2);
    
    // Ensure completed job remains retrievable (TTL check conceptually)
    assert.ok(jobService.getJob(jobId));
  });

  await t.test('AI failure: Transitions to failed state', async () => {
    currentFetchMock = async () => {
      return new Response('{"error": {"message": "Rate limit exceeded"}}', { 
        status: 429, 
        headers: { 'Content-Type': 'application/json' } 
      });
    };

    const csvContent = `Name,Email\nTest,test@example.com`;
    const filePath = await setupTestCsv(csvContent);
    const jobId = 'test-job-fail';

    await processImport(filePath, jobId);

    const job = jobService.getJob(jobId);
    assert.strictEqual(job?.status, 'failed');
    assert.strictEqual(job?.error?.code, 'RATE_LIMIT');
    assert.strictEqual(job?.error?.retryable, true);
  });

  await t.test('Quota Exhaustion immediately halts without retries', async () => {
    currentFetchMock = async () => {
      return new Response('{"error": {"message": "Quota exceeded for this month"}}', { 
        status: 429, 
        headers: { 'Content-Type': 'application/json' } 
      });
    };

    const csvContent = `Name,Email\nQuota,quota@example.com`;
    const filePath = await setupTestCsv(csvContent);
    const jobId = 'test-job-quota';

    const startTime = Date.now();
    await processImport(filePath, jobId);
    const duration = Date.now() - startTime;

    const job = jobService.getJob(jobId);
    assert.strictEqual(job?.status, 'failed');
    assert.strictEqual(job?.error?.code, 'QUOTA_EXHAUSTED');
    assert.strictEqual(job?.error?.retryable, false);
    
    // AI SDK exponential backoff might take some time, but we should verify it doesn't take > 10s
    assert.ok(duration < 10000, 'Quota failure took too long, suggesting infinite retries');
  });

  await t.test('AI Mock Mode bypasses Gemini entirely', async () => {
    process.env.AI_MOCK_MODE = 'true';
    
    // Create a mock that throws to prove it is NEVER called
    currentFetchMock = async () => {
      throw new Error("Gemini should not be called in mock mode");
    };

    const csvContent = `First Name,Contact Mail\nMocked Name,mock.test@example.com`;
    const filePath = await setupTestCsv(csvContent);
    const jobId = 'test-job-mock';

    await processImport(filePath, jobId);

    const job = jobService.getJob(jobId);
    assert.strictEqual(job?.status, 'completed');
    assert.strictEqual(job?.progress, 100);
    assert.strictEqual(job?.result?.parsedRecords[0]?.name, 'Mocked Name');
    assert.strictEqual(job?.result?.parsedRecords[0]?.email, 'mock.test@example.com');
    assert.strictEqual(job?.result?.parsedRecords[0]?.data_source, 'leads_on_demand');
    assert.strictEqual(job?.result?.parsedRecords[0]?.crm_note, 'Generated by AI Mock Mode');

    process.env.AI_MOCK_MODE = 'false';
  });

  await t.test('Frontend State Machine Transition Replica', async () => {
    let appState = 'upload';
    
    // Simulating the polling transition when job fails
    const mockPollResponse = { status: 'failed', error: { message: "Server error" } };
    
    // Simulate what handleConfirmImport does when it sees 'failed'
    try {
      if (mockPollResponse.status === 'failed') {
        throw new Error(mockPollResponse.error.message);
      }
    } catch {
      appState = 'failed';
    }

    // Verify it transitions to 'failed', not 'preview'
    assert.strictEqual(appState, 'failed');
  });

  await t.test('Mapping Engine integration: missing required contact fields', async () => {
    process.env.AI_MOCK_MODE = 'true';
    
    // If backend receives a CSV and mapping that deliberately unmaps contact fields, Rule 10 should skip all.
    const csvContent = `Name,Job\nBob,Builder`;
    const filePath = await setupTestCsv(csvContent);
    const jobId = 'test-job-missing-contact';

    await processImport(filePath, jobId, {
      mappings: [
        { sourceColumn: 'Name', targetField: 'name', status: 'mapped' },
        { sourceColumn: 'Job', targetField: null, status: 'unmapped' }
      ]
    });

    const job = jobService.getJob(jobId);
    assert.strictEqual(job?.status, 'completed');
    assert.strictEqual(job?.result?.parsedRecords.length, 0);
    assert.strictEqual(job?.result?.skippedRecords.length, 1);
    assert.match(job?.result?.skippedRecords[0].reason || '', /email and mobile/);
    
    process.env.AI_MOCK_MODE = 'false';
  });

  await t.test('Database Persistence: Successful imports are saved to SQLite', async () => {
    process.env.AI_MOCK_MODE = 'true';
    const csvContent = `Name,Email\nDB Test,db.test@example.com`;
    const filePath = await setupTestCsv(csvContent);
    const jobId = crypto.randomUUID();

    await processImport(filePath, jobId, {
      mappings: [
        { sourceColumn: 'Name', targetField: 'name', status: 'mapped' },
        { sourceColumn: 'Email', targetField: 'email', status: 'mapped' }
      ]
    });

    const job = jobService.getJob(jobId);
    assert.strictEqual(job?.status, 'completed');

    // Verify it was inserted into DB
    const importRow = db.prepare('SELECT * FROM imports WHERE id = ?').get(jobId) as Record<string, unknown>;
    assert.ok(importRow);
    assert.strictEqual(importRow.rowCount, 1);
    assert.strictEqual(importRow.successRate, 1);

    const leadRows = db.prepare('SELECT * FROM leads WHERE import_id = ?').all(jobId) as Record<string, unknown>[];
    assert.strictEqual(leadRows.length, 1);
    assert.strictEqual(leadRows[0].name, 'DB Test');
    assert.strictEqual(leadRows[0].email, 'db.test@example.com');
    
    // Cleanup DB row
    db.prepare('DELETE FROM imports WHERE id = ?').run(jobId);
    db.prepare('DELETE FROM leads WHERE import_id = ?').run(jobId);

    process.env.AI_MOCK_MODE = 'false';
  });

  // Restore mock not needed as t.mock.method scopes to the test
});
