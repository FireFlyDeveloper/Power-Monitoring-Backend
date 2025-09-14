export async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delay = 1000,
): Promise<T> {
  let attempt = 0;
  let lastError: any;

  while (attempt <= retries) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      attempt++;
      if (attempt > retries) break;

      const backoff = delay * Math.pow(2, attempt - 1);
      console.warn(
        `⚠️ Report generation failed (attempt ${attempt}/${retries}). Retrying in ${backoff}ms...`,
        err,
      );
      await new Promise((res) => setTimeout(res, backoff));
    }
  }

  throw lastError;
}
