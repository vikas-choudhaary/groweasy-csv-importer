import { describe, test, mock, afterEach } from 'node:test';
import assert from 'node:assert';
import { withRetry } from '../server/src/utils/retry';

describe('Retry Logic Tests', { timeout: 10000 }, () => {
  afterEach(() => {
    mock.restoreAll();
  });

  test('withRetry invokes function until success with backoff', async () => {
    let attempts = 0;
    const fn = async () => {
      attempts++;
      if (attempts < 3) throw new Error('429 Rate limit exceeded');
      return 'Success';
    };
    
    const start = Date.now();
    const result = await withRetry(fn, 3, 100);
    const duration = Date.now() - start;
    
    assert.strictEqual(result, 'Success');
    assert.strictEqual(attempts, 3);
    // Backoff: ~100ms + ~200ms = ~300ms, with 20% jitter min could be 80 + 160 = 240
    assert.ok(duration >= 200, `Duration was ${duration}ms, expected >= 200ms`);
  });

  test('withRetry propagates error after max attempts', async () => {
    const fn = async () => { throw new Error('429 Persistent rate limit'); };
    await assert.rejects(() => withRetry(fn, 3, 10), /429 Persistent rate limit/);
  });

});
