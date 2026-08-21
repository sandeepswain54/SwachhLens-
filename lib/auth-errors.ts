/**
 * Supabase surfaces two distinct rate limits as plain error messages:
 *  - a per-address cooldown ("...after 57 seconds") between consecutive
 *    auth emails, which always applies;
 *  - a shared hourly quota ("email rate limit exceeded") on projects that
 *    haven't configured a custom SMTP provider (default is 2 emails/hour).
 *
 * This turns both into a friendlier message and, when Supabase told us
 * exactly how long to wait, a countdown in seconds to drive a cooldown.
 */
export function parseAuthError(message: string): {
  message: string;
  retryAfterSeconds?: number;
} {
  const retryMatch = message.match(/after (\d+) seconds?/i);
  if (retryMatch) {
    const seconds = Number(retryMatch[1]);
    return {
      message: `Please wait ${seconds}s before trying again.`,
      retryAfterSeconds: seconds,
    };
  }

  if (/rate limit/i.test(message)) {
    return {
      message:
        'Too many emails sent recently. Please wait a few minutes and try again, or contact support if this keeps happening.',
      retryAfterSeconds: 60,
    };
  }

  return { message };
}
