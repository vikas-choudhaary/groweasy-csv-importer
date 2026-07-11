import { AppError } from './errors';

export async function withRetry<T>(
  fn: () => Promise<T>,
  retries: number = 2, // Maximum 2 retries as per requirements
  delayMs: number = 1000
): Promise<T> {
  for (let i = 0; i <= retries; i++) {
    const attempt = i + 1;
    try {
      return await fn();
    } catch (error: unknown) {
      if (i === retries) throw error;
      // Unwrap vercel ai sdk RetryError if present
      const actualError = ((error as Record<string, unknown>)?.lastError || error) as Error & Record<string, unknown>;
      const errorMessage = (actualError?.message || '') + ' ' + (actualError?.responseBody || '');
      const errorMessageLower = errorMessage.toLowerCase();
      const statusCode = actualError?.statusCode;

      console.warn(`[Backend] Retry ${attempt} failed with ${statusCode || 'unknown'}: ${errorMessage}`);
      const retryAfter = (actualError as any)?.responseHeaders?.['retry-after'];

      // Check for quota exhaustion
      if (errorMessageLower.includes('quota') && errorMessageLower.includes('exceeded')) {
        // Quota exhaustion should halt immediately
        throw new AppError('QUOTA_EXHAUSTED', 'AI service quota has been exhausted. Please check your billing or quota limits.', 429, false);
      }

      const isRateLimit = statusCode === 429 || errorMessageLower.includes('429') || errorMessageLower.includes('rate limit');

      if (!isRateLimit || attempt > retries) {
        throw actualError;
      }

      // Respect Retry-After header if available
      const retryAfterStr = (actualError as any)?.responseHeaders?.['retry-after'];
      let currentDelay = delayMs;
      if (retryAfterStr) {
        const parsed = parseInt(retryAfterStr, 10);
        if (!isNaN(parsed)) {
          currentDelay = parsed * 1000;
        }
      }

      // Add jitter (±20%)
      const jitter = currentDelay * 0.2;
      const randomizedDelay = currentDelay + (Math.random() * jitter * 2 - jitter);

      console.warn(`Attempt ${attempt} failed with Rate Limit. Retrying in ${Math.round(randomizedDelay)}ms...`);
      await new Promise(resolve => setTimeout(resolve, randomizedDelay));
      
      delayMs *= 2; // Exponential backoff for next time
    }
  }
  throw new Error('Unreachable code in retry');
}
