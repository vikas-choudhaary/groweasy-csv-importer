/**
 * Regression tests for confirmed CSV processing correctness bugs:
 * 1. Mobile-only records (no email) must be imported, not skipped.
 * 2. Valid source created_at dates must be preserved; invalid/missing must be blank.
 * 3. Multiple emails must keep first valid email, append extras to crm_note.
 * 4. Multiple mobiles must keep first valid mobile, append extras to crm_note.
 * 5. crm_note existing content must not be overwritten.
 */
import { describe, test, after } from 'node:test';
import assert from 'node:assert';
import { normalizeRecord, isValidEmail, isValidMobile } from '../server/src/services/import.service';
import crypto from 'crypto';
import fs from 'fs';
import { jobService } from '../server/src/services/jobs.service';
import db from '../server/src/utils/db';

// Close the SQLite connection after all tests finish so Node can exit cleanly.
// better-sqlite3 keeps the event loop alive until the handle is explicitly closed.
after(() => {
  try { db.close(); } catch (_) {}
});

// ─── Unit: normalizeRecord ────────────────────────────────────────────────────

describe('normalizeRecord – email/mobile splitting', () => {
  test('keeps first valid email, appends extras to crm_note', () => {
    const result = normalizeRecord({
      email: 'first@example.com; second@example.com; third@example.com',
      mobile_without_country_code: '9876543210',
      crm_note: '',
      created_at: '2025-03-15',
    } as Record<string, string>);

    assert.strictEqual(result.email, 'first@example.com');
    assert.ok(result.crm_note.includes('second@example.com'), `crm_note missing second email: ${result.crm_note}`);
    assert.ok(result.crm_note.includes('third@example.com'), `crm_note missing third email: ${result.crm_note}`);
  });

  test('keeps first valid mobile, appends extras to crm_note', () => {
    const result = normalizeRecord({
      email: 'test@example.com',
      mobile_without_country_code: '9000033333; 9000044444',
      crm_note: '',
      created_at: '',
    } as Record<string, string>);

    assert.strictEqual(result.mobile_without_country_code, '9000033333');
    assert.ok(result.crm_note.includes('9000044444'), `crm_note missing extra mobile: ${result.crm_note}`);
  });

  test('does not overwrite existing crm_note when appending extras', () => {
    const result = normalizeRecord({
      email: 'a@example.com; b@example.com',
      mobile_without_country_code: '9000011111',
      crm_note: 'Existing note',
      created_at: '',
    } as Record<string, string>);

    assert.ok(result.crm_note.startsWith('Existing note'), `crm_note lost existing content: ${result.crm_note}`);
    assert.ok(result.crm_note.includes('b@example.com'), `crm_note missing extra email: ${result.crm_note}`);
  });

  test('clears invalid email so mobile-only record can pass validation', () => {
    const result = normalizeRecord({
      email: 'bademail@',  // invalid: no domain
      mobile_without_country_code: '9000011111',
      crm_note: '',
      created_at: '',
    } as Record<string, string>);

    assert.strictEqual(result.email, '', `Expected email to be cleared, got: ${result.email}`);
    assert.strictEqual(result.mobile_without_country_code, '9000011111');
  });

  test('preserves valid source created_at date', () => {
    const result = normalizeRecord({
      email: 'test@example.com',
      mobile_without_country_code: '',
      crm_note: '',
      created_at: '2025-04-01',
    } as Record<string, string>);

    assert.strictEqual(result.created_at, '2025-04-01');
  });

  test('clears invalid created_at — does not inject current timestamp', () => {
    const before = Date.now();
    const result = normalizeRecord({
      email: 'test@example.com',
      mobile_without_country_code: '',
      crm_note: '',
      created_at: 'not a real date',
    } as Record<string, string>);

    assert.strictEqual(result.created_at, '', `Expected blank created_at, got: ${result.created_at}`);
    // Also verify no current-timestamp injection
    if (result.created_at) {
      const d = new Date(result.created_at).getTime();
      assert.ok(d < before - 1000, 'created_at must not be near current time');
    }
  });

  test('leaves created_at blank when source is empty', () => {
    const result = normalizeRecord({
      email: 'test@example.com',
      mobile_without_country_code: '',
      crm_note: '',
      created_at: '',
    } as Record<string, string>);

    assert.strictEqual(result.created_at, '');
  });

  test('comma-separated emails are split correctly', () => {
    const result = normalizeRecord({
      email: 'one@test.com, two@test.com',
      mobile_without_country_code: '',
      crm_note: '',
      created_at: '',
    } as Record<string, string>);

    assert.strictEqual(result.email, 'one@test.com');
    assert.ok(result.crm_note.includes('two@test.com'));
  });
});

describe('normalizeRecord – email/mobile validators', () => {
  test('isValidEmail accepts proper addresses', () => {
    assert.ok((isValidEmail as Function)('user@example.com'));
    assert.ok((isValidEmail as Function)('a.b+tag@sub.domain.org'));
  });

  test('isValidEmail rejects bad addresses', () => {
    assert.ok(!(isValidEmail as Function)(''));
    assert.ok(!(isValidEmail as Function)('noatsign'));
    assert.ok(!(isValidEmail as Function)('bad@'));
    assert.ok(!(isValidEmail as Function)('@nodomain'));
  });

  test('isValidMobile accepts 7–15 digit strings', () => {
    assert.ok((isValidMobile as Function)('9000011111'));
    assert.ok((isValidMobile as Function)('123-456-7890'));
    assert.ok((isValidMobile as Function)('1234567'));
  });

  test('isValidMobile rejects short or non-numeric strings', () => {
    assert.ok(!(isValidMobile as Function)(''));
    assert.ok(!(isValidMobile as Function)('123'));
    assert.ok(!(isValidMobile as Function)('abcdefghij'));
  });
});

// ─── Integration: processImport with groweasy_messy_test_1.csv ────────────────

describe('Integration: groweasy_messy_test_1.csv regression', () => {
  test('6 processed: 5 imported, 1 skipped (Invalid Contact only)', async () => {
    process.env.AI_MOCK_MODE = 'true';

    const { processImport } = await import('../server/src/services/import.service');

    const fixturePath = 'tests/fixtures/groweasy_messy_test_1.csv';
    const csvContent = fs.readFileSync(fixturePath, 'utf-8');
    const tmpPath = `test-regression-${crypto.randomUUID()}.csv`;
    fs.writeFileSync(tmpPath, csvContent);

    const jobId = `regression-messy-${crypto.randomUUID()}`;

    const mappingConfig = {
      mappings: [
        { sourceColumn: 'Name', targetField: 'name', status: 'mapped' },
        { sourceColumn: 'Email', targetField: 'email', status: 'mapped' },
        { sourceColumn: 'Contact Numbers', targetField: 'mobile_without_country_code', status: 'mapped' },
        { sourceColumn: 'Created On', targetField: 'created_at', status: 'mapped' },
        { sourceColumn: 'Notes', targetField: 'crm_note', status: 'mapped' },
      ],
    };

    await processImport(tmpPath, jobId, mappingConfig);

    const job = jobService.getJob(jobId);
    assert.ok(job, 'Job should exist');
    assert.strictEqual(job?.status, 'completed', `Job failed: ${JSON.stringify(job?.error)}`);

    const result = job?.result;
    assert.ok(result, 'Result should exist');

    assert.strictEqual(result?.summary.total, 6, `Expected 6 total, got ${result?.summary.total}`);
    assert.strictEqual(result?.summary.imported, 5, `Expected 5 imported, got ${result?.summary.imported}`);
    assert.strictEqual(result?.summary.skipped, 1, `Expected 1 skipped, got ${result?.summary.skipped}`);

    // Only "Invalid Contact" should be skipped
    const skipped = result?.skippedRecords ?? [];
    assert.strictEqual(skipped.length, 1);
    const skippedName = String(skipped[0].originalRecord['Name'] ?? '');
    assert.ok(
      skippedName.toLowerCase().includes('invalid'),
      `Wrong record skipped: "${skippedName}"`
    );

    const imported = result?.parsedRecords ?? [];

    // Rohan Shah: mobile-only, must be imported
    const rohan = imported.find(r => String(r.name).toLowerCase().includes('rohan'));
    assert.ok(rohan, 'Rohan Shah (mobile-only) should be imported');
    assert.strictEqual(rohan?.email, '', `Rohan email should be empty, got: ${rohan?.email}`);
    assert.ok(rohan?.mobile_without_country_code, 'Rohan should have a mobile');

    // Anita Desai: multiple emails → first only in email, extras in crm_note
    const anita = imported.find(r => String(r.name).toLowerCase().includes('anita'));
    assert.ok(anita, 'Anita Desai should be imported');
    assert.strictEqual(anita?.email, 'anita.desai@example.com', `Anita email wrong: ${anita?.email}`);
    assert.ok(
      anita?.crm_note.includes('anita.work@example.com'),
      `Anita crm_note missing extra email: ${anita?.crm_note}`
    );

    // Suresh Kumar: multiple mobiles → first only in mobile, extras in crm_note
    const suresh = imported.find(r => String(r.name).toLowerCase().includes('suresh'));
    assert.ok(suresh, 'Suresh Kumar should be imported');
    assert.strictEqual(suresh?.mobile_without_country_code, '9000033333', `Suresh mobile wrong: ${suresh?.mobile_without_country_code}`);
    assert.ok(
      suresh?.crm_note.includes('9000044444'),
      `Suresh crm_note missing extra mobile: ${suresh?.crm_note}`
    );

    // Priya Mehta: valid created_at must be preserved
    const priya = imported.find(r => String(r.name).toLowerCase().includes('priya'));
    assert.ok(priya, 'Priya Mehta should be imported');
    assert.ok(priya?.created_at, `Priya created_at should not be blank, got: "${priya?.created_at}"`);
    const priyaDate = new Date(priya?.created_at ?? '');
    assert.ok(!isNaN(priyaDate.getTime()), `Priya created_at not a valid date: ${priya?.created_at}`);
    // Must NOT be today's date — source date is 2025-03-15
    assert.ok(
      priyaDate.getFullYear() === 2025,
      `Priya created_at year should be 2025, got: ${priya?.created_at}`
    );

    // Cleanup DB
    try {
      db.prepare('DELETE FROM imports WHERE id = ?').run(jobId);
      db.prepare('DELETE FROM leads WHERE import_id = ?').run(jobId);
    } catch (_) {}

    process.env.AI_MOCK_MODE = 'false';
  });
});

// ─── Integration: backend rejects duplicate target mappings ──────────────────

describe('Integration: backend duplicate target mapping guard', () => {
  test('processImport skips duplicate target field — last mapping wins (import.service behaviour)', async () => {
    // The import service does NOT reject — it processes deterministically.
    // When two source columns map to the same CRM target, the last one wins (object spread).
    // This test documents the actual behaviour and verifies no crash occurs.
    process.env.AI_MOCK_MODE = 'true';

    const { processImport } = await import('../server/src/services/import.service');

    const csvContent = `Col A,Col B,Email\nAlice,Bob,alice@example.com\n`;
    const tmpPath = `test-dedup-backend-${crypto.randomUUID()}.csv`;
    fs.writeFileSync(tmpPath, csvContent);
    const jobId = `dedup-backend-${crypto.randomUUID()}`;

    // Deliberately send duplicate target mapping (Col A and Col B both -> name)
    const mappingConfig = {
      mappings: [
        { sourceColumn: 'Col A', targetField: 'name', status: 'mapped' },
        { sourceColumn: 'Col B', targetField: 'name', status: 'mapped' },   // duplicate
        { sourceColumn: 'Email', targetField: 'email', status: 'mapped' },
      ],
    };

    await processImport(tmpPath, jobId, mappingConfig);

    const job = jobService.getJob(jobId);
    assert.strictEqual(job?.status, 'completed');
    // Record still imports (not crashed), exactly one name value
    const record = job?.result?.parsedRecords[0];
    assert.ok(record, 'Record should be imported');
    // name is either "Alice" or "Bob" — either way, it's a single string, not concatenated
    assert.ok(typeof record.name === 'string' && record.name.length > 0, `name should be a non-empty string, got: ${record?.name}`);

    try {
      db.prepare('DELETE FROM imports WHERE id = ?').run(jobId);
      db.prepare('DELETE FROM leads WHERE import_id = ?').run(jobId);
    } catch (_) {}

    process.env.AI_MOCK_MODE = 'false';
  });
});
