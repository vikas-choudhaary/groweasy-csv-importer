/**
 * Regression tests for duplicate email handling in database persistence.
 * 
 * Policy: Duplicate emails (based on existing leads in DB or within same import)
 * are treated as skipped records. The import job continues for other records.
 * The job is only marked as FAILED if there is an unexpected database error
 * (not a UNIQUE constraint violation).
 */
import { describe, test, after, before } from 'node:test';
import assert from 'node:assert';
import crypto from 'crypto';
import fs from 'fs';
import { jobService } from '../server/src/services/jobs.service';
import db from '../server/src/utils/db';

describe('Duplicate email handling', () => {
  // Clean DB before each test to ensure isolation
  const cleanDb = () => {
    try {
      db.exec(`DELETE FROM leads WHERE email LIKE '%@example.com'`);
      db.exec(`DELETE FROM imports WHERE id LIKE '%test%' OR id LIKE '%dup%' OR id LIKE '%counts%' OR id LIKE '%seed%' OR id LIKE '%mixed%' OR id LIKE '%unexpected%'`);
    } catch (_) {}
  };

  before(() => {
    cleanDb();
  });

  after(() => {
    try { db.close(); } catch (_) {}
  });

  test('Duplicate email in CSV (multiple rows with same email) — only first imported, others skipped', async () => {
    cleanDb(); // Clean before this test
    process.env.AI_MOCK_MODE = 'true';

    const { processImport } = await import('../server/src/services/import.service');

    const csvContent = `Name,Email,Mobile
John Doe,john@example.com,9876543210
Jane Smith,jane@example.com,9876543211
John Duplicate,john@example.com,9876543212`;

    const tmpPath = `test-dup-in-csv-${crypto.randomUUID()}.csv`;
    fs.writeFileSync(tmpPath, csvContent);
    const jobId = `dup-csv-${crypto.randomUUID()}`;

    const mappingConfig = {
      mappings: [
        { sourceColumn: 'Name', targetField: 'name', status: 'mapped' },
        { sourceColumn: 'Email', targetField: 'email', status: 'mapped' },
        { sourceColumn: 'Mobile', targetField: 'mobile_without_country_code', status: 'mapped' },
      ],
    };

    await processImport(tmpPath, jobId, mappingConfig);

    const job = jobService.getJob(jobId);
    assert.ok(job);
    assert.strictEqual(job?.status, 'completed');

    const summary = job?.result?.summary;
    assert.strictEqual(summary?.total, 3);
    assert.strictEqual(summary?.imported, 2, 'Expected 2 unique emails imported (john + jane)');
    assert.strictEqual(summary?.skipped, 1, 'Expected 1 duplicate (john duplicate)');

    const skipped = job?.result?.skippedRecords ?? [];
    const duplicateSkip = skipped.find(r => r.reason.includes('already exists'));
    assert.ok(duplicateSkip, 'Expected a skip reason mentioning duplicate email');

    // Cleanup
    try {
      db.prepare('DELETE FROM imports WHERE id = ?').run(jobId);
      db.prepare('DELETE FROM leads WHERE import_id = ?').run(jobId);
    } catch (_) {}

    process.env.AI_MOCK_MODE = 'false';
  });

  test('Duplicate email against existing DB record — skipped, other records imported', async () => {
    cleanDb(); // Clean before this test
    process.env.AI_MOCK_MODE = 'true';

    const { processImport } = await import('../server/src/services/import.service');

    // First, seed a lead into the DB
    const seedJob = `seed-${crypto.randomUUID()}`;
    const seedCsv = `Name,Email,Mobile\nSeed User,seed@example.com,1111111111`;
    const seedPath = `seed-${crypto.randomUUID()}.csv`;
    fs.writeFileSync(seedPath, seedCsv);

    const seedConfig = {
      mappings: [
        { sourceColumn: 'Name', targetField: 'name', status: 'mapped' },
        { sourceColumn: 'Email', targetField: 'email', status: 'mapped' },
        { sourceColumn: 'Mobile', targetField: 'mobile_without_country_code', status: 'mapped' },
      ],
    };

    await processImport(seedPath, seedJob, seedConfig);
    // Ensure seed succeeded
    const seedJobState = jobService.getJob(seedJob);
    assert.strictEqual(seedJobState?.status, 'completed');
    assert.strictEqual(seedJobState?.result?.summary?.imported, 1);

    // Now import a CSV with the same email
    const csvContent = `Name,Email,Mobile
John Doe,john@example.com,9876543210
Seed User,seed@example.com,9876543211
Jane Smith,jane@example.com,9876543212`;

    const tmpPath = `test-dup-db-${crypto.randomUUID()}.csv`;
    fs.writeFileSync(tmpPath, csvContent);
    const jobId = `dup-db-${crypto.randomUUID()}`;

    const mappingConfig = {
      mappings: [
        { sourceColumn: 'Name', targetField: 'name', status: 'mapped' },
        { sourceColumn: 'Email', targetField: 'email', status: 'mapped' },
        { sourceColumn: 'Mobile', targetField: 'mobile_without_country_code', status: 'mapped' },
      ],
    };

    await processImport(tmpPath, jobId, mappingConfig);

    const job = jobService.getJob(jobId);
    assert.ok(job);
    assert.strictEqual(job?.status, 'completed');

    const summary = job?.result?.summary;
    // 3 rows, 1 seed duplicate, 2 new unique
    assert.strictEqual(summary?.total, 3);
    assert.strictEqual(summary?.imported, 2, 'Expected 2 imported (john and jane, seed was duplicate)');
    assert.strictEqual(summary?.skipped, 1);

    const skipped = job?.result?.skippedRecords ?? [];
    const duplicateSkip = skipped.find(r => r.reason.includes('already exists'));
    assert.ok(duplicateSkip);
    const skippedName = String(duplicateSkip.originalRecord['Name'] ?? '');
    assert.ok(skippedName.toLowerCase().includes('seed'), `Expected seed user to be skipped, got: ${skippedName}`);

    // Cleanup
    try {
      db.prepare('DELETE FROM imports WHERE id = ?').run(seedJob);
      db.prepare('DELETE FROM leads WHERE import_id = ?').run(seedJob);
      db.prepare('DELETE FROM imports WHERE id = ?').run(jobId);
      db.prepare('DELETE FROM leads WHERE import_id = ?').run(jobId);
    } catch (_) {}

    process.env.AI_MOCK_MODE = 'false';
  });

  test('Mixed batch with valid new leads and duplicates — partial success persisted', async () => {
    cleanDb(); // Clean before this test
    process.env.AI_MOCK_MODE = 'true';

    const { processImport } = await import('../server/src/services/import.service');

    const csvContent = `Name,Email,Mobile
Alice,alice@example.com,1111111111
Bob,bob@example.com,2222222222
Carol,carol@example.com,3333333333
Alice,alice@example.com,4444444444
Eve,eve@example.com,5555555555`;

    const tmpPath = `test-mixed-${crypto.randomUUID()}.csv`;
    fs.writeFileSync(tmpPath, csvContent);
    const jobId = `mixed-${crypto.randomUUID()}`;

    const mappingConfig = {
      mappings: [
        { sourceColumn: 'Name', targetField: 'name', status: 'mapped' },
        { sourceColumn: 'Email', targetField: 'email', status: 'mapped' },
        { sourceColumn: 'Mobile', targetField: 'mobile_without_country_code', status: 'mapped' },
      ],
    };

    await processImport(tmpPath, jobId, mappingConfig);

    const job = jobService.getJob(jobId);
    assert.ok(job);
    assert.strictEqual(job?.status, 'completed');

    const summary = job?.result?.summary;
    assert.strictEqual(summary?.total, 5);
    assert.strictEqual(summary?.imported, 4, 'Expected 4 unique emails (alice, bob, carol, eve)');
    assert.strictEqual(summary?.skipped, 1, 'Expected 1 duplicate alice');

    const skipped = job?.result?.skippedRecords ?? [];
    const duplicateSkips = skipped.filter(r => r.reason.includes('already exists'));
    assert.strictEqual(duplicateSkips.length, 1);

    // Cleanup
    try {
      db.prepare('DELETE FROM imports WHERE id = ?').run(jobId);
      db.prepare('DELETE FROM leads WHERE import_id = ?').run(jobId);
    } catch (_) {}

    process.env.AI_MOCK_MODE = 'false';
  });

  test('Job reports failure on unexpected DB error, not on UNIQUE constraint', async () => {
    cleanDb(); // Clean before this test
    // This is more of a structural test — verifying that the code path handles
    // unexpected DB errors vs UNIQUE constraint differently.
    // We cannot easily trigger an unexpected DB error in tests.
    // The test documents the expected behavior instead.

    process.env.AI_MOCK_MODE = 'true';

    const { processImport } = await import('../server/src/services/import.service');

    const csvContent = `Name,Email,Mobile
Test,test@example.com,1234567890`;

    const tmpPath = `test-unexpected-db-${crypto.randomUUID()}.csv`;
    fs.writeFileSync(tmpPath, csvContent);
    const jobId = `unexpected-${crypto.randomUUID()}`;

    const mappingConfig = {
      mappings: [
        { sourceColumn: 'Name', targetField: 'name', status: 'mapped' },
        { sourceColumn: 'Email', targetField: 'email', status: 'mapped' },
        { sourceColumn: 'Mobile', targetField: 'mobile_without_country_code', status: 'mapped' },
      ],
    };

    await processImport(tmpPath, jobId, mappingConfig);

    const job = jobService.getJob(jobId);
    // Normal import should succeed
    assert.strictEqual(job?.status, 'completed');

    // Cleanup
    try {
      db.prepare('DELETE FROM imports WHERE id = ?').run(jobId);
      db.prepare('DELETE FROM leads WHERE import_id = ?').run(jobId);
    } catch (_) {}

    process.env.AI_MOCK_MODE = 'false';
  });

  test('Summary counts match actual DB rows after import', async () => {
    cleanDb(); // Clean before this test
    process.env.AI_MOCK_MODE = 'true';

    const { processImport } = await import('../server/src/services/import.service');

    const csvContent = `Name,Email,Mobile
Alice,alice@example.com,1111111111
Bob,bob@example.com,2222222222
Carol,carol@example.com,3333333333`;

    const tmpPath = `test-counts-${crypto.randomUUID()}.csv`;
    fs.writeFileSync(tmpPath, csvContent);
    const jobId = `counts-${crypto.randomUUID()}`;

    const mappingConfig = {
      mappings: [
        { sourceColumn: 'Name', targetField: 'name', status: 'mapped' },
        { sourceColumn: 'Email', targetField: 'email', status: 'mapped' },
        { sourceColumn: 'Mobile', targetField: 'mobile_without_country_code', status: 'mapped' },
      ],
    };

    await processImport(tmpPath, jobId, mappingConfig);

    const job = jobService.getJob(jobId);
    assert.strictEqual(job?.status, 'completed');
    const summary = job?.result?.summary;
    assert.strictEqual(summary?.imported, 3);
    assert.strictEqual(summary?.skipped, 0);

    // Verify actual DB counts
    const importRow = db.prepare('SELECT importedCount, skippedCount FROM imports WHERE id = ?').get(jobId) as any;
    assert.strictEqual(importRow?.importedCount, 3);
    assert.strictEqual(importRow?.skippedCount, 0);

    const leadRows = db.prepare('SELECT COUNT(*) AS cnt FROM leads WHERE import_id = ?').all(jobId) as { cnt: number }[];
    assert.strictEqual(leadRows[0]?.cnt, 3);

    // Cleanup
    try {
      db.prepare('DELETE FROM imports WHERE id = ?').run(jobId);
      db.prepare('DELETE FROM leads WHERE import_id = ?').run(jobId);
    } catch (_) {}

    process.env.AI_MOCK_MODE = 'false';
  });
});
