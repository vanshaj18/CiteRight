'use server';

/**
 * Rate limiter service
 * Tracks API usage to prevent exceeding rate limits
 * 
 * Limits:
 * - RPM (Requests Per Minute): 30
 * - RPD (Requests Per Day): 1,000
 * - TPM (Tokens Per Minute): 30,000
 * - TPD (Tokens Per Day): 500,000
 */

interface RateLimitWindow {
  requests: number[];
  tokens: number[];
  windowStart: number;
}

interface DailyLimit {
  requests: number;
  tokens: number;
  date: string; // YYYY-MM-DD format
}

// In-memory storage (for serverless, consider using Redis or a database in production)
const minuteWindows = new Map<string, RateLimitWindow>();
const dailyLimits = new Map<string, DailyLimit>();

const RATE_LIMITS = {
  REQUESTS_PER_MINUTE: 30,
  REQUESTS_PER_DAY: 1000,
  TOKENS_PER_MINUTE: 30000,
  TOKENS_PER_DAY: 500000,
} as const;

/**
 * Get current minute window key
 */
function getMinuteKey(): string {
  const now = Date.now();
  const minute = Math.floor(now / 60000); // Round down to nearest minute
  return `minute:${minute}`;
}

/**
 * Get current day key
 */
function getDayKey(): string {
  const now = new Date();
  return `day:${now.toISOString().split('T')[0]}`;
}

/**
 * Clean up old windows (keep only last 2 minutes)
 */
function cleanupOldWindows() {
  const now = Date.now();
  const currentMinute = Math.floor(now / 60000);
  
  for (const [key, window] of minuteWindows.entries()) {
    const windowMinute = parseInt(key.split(':')[1]);
    if (currentMinute - windowMinute > 2) {
      minuteWindows.delete(key);
    }
  }
}

/**
 * Check if a request can be made based on rate limits
 * @param estimatedTokens - Estimated tokens for this request
 * @returns Object with allowed status and remaining limits
 */
export async function checkRateLimit(estimatedTokens: number = 0): Promise<{
  allowed: boolean;
  reason?: string;
  remainingRequestsPerMinute?: number;
  remainingRequestsPerDay?: number;
  remainingTokensPerMinute?: number;
  remainingTokensPerDay?: number;
}> {
  cleanupOldWindows();
  
  const minuteKey = getMinuteKey();
  const dayKey = getDayKey();
  
  // Get or create minute window
  let minuteWindow = minuteWindows.get(minuteKey);
  if (!minuteWindow) {
    minuteWindow = {
      requests: [],
      tokens: [],
      windowStart: Date.now(),
    };
    minuteWindows.set(minuteKey, minuteWindow);
  }
  
  // Get or create daily limit
  let dailyLimit = dailyLimits.get(dayKey);
  if (!dailyLimit) {
    dailyLimit = {
      requests: 0,
      tokens: 0,
      date: dayKey.split(':')[1],
    };
    dailyLimits.set(dayKey, dailyLimit);
  }
  
  // Clean up old daily limits (keep only today)
  const today = new Date().toISOString().split('T')[0];
  for (const [key, limit] of dailyLimits.entries()) {
    if (limit.date !== today) {
      dailyLimits.delete(key);
    }
  }
  
  // Check minute limits
  const requestsThisMinute = minuteWindow.requests.length;
  const tokensThisMinute = minuteWindow.tokens.reduce((sum, tokens) => sum + tokens, 0);
  
  if (requestsThisMinute >= RATE_LIMITS.REQUESTS_PER_MINUTE) {
    return {
      allowed: false,
      reason: `Rate limit exceeded: ${RATE_LIMITS.REQUESTS_PER_MINUTE} requests per minute`,
      remainingRequestsPerMinute: 0,
      remainingRequestsPerDay: Math.max(0, RATE_LIMITS.REQUESTS_PER_DAY - dailyLimit.requests),
      remainingTokensPerMinute: Math.max(0, RATE_LIMITS.TOKENS_PER_MINUTE - tokensThisMinute),
      remainingTokensPerDay: Math.max(0, RATE_LIMITS.TOKENS_PER_DAY - dailyLimit.tokens),
    };
  }
  
  if (tokensThisMinute + estimatedTokens > RATE_LIMITS.TOKENS_PER_MINUTE) {
    return {
      allowed: false,
      reason: `Rate limit exceeded: ${RATE_LIMITS.TOKENS_PER_MINUTE} tokens per minute`,
      remainingRequestsPerMinute: Math.max(0, RATE_LIMITS.REQUESTS_PER_MINUTE - requestsThisMinute),
      remainingRequestsPerDay: Math.max(0, RATE_LIMITS.REQUESTS_PER_DAY - dailyLimit.requests),
      remainingTokensPerMinute: 0,
      remainingTokensPerDay: Math.max(0, RATE_LIMITS.TOKENS_PER_DAY - dailyLimit.tokens),
    };
  }
  
  // Check daily limits
  if (dailyLimit.requests >= RATE_LIMITS.REQUESTS_PER_DAY) {
    return {
      allowed: false,
      reason: `Daily limit exceeded: ${RATE_LIMITS.REQUESTS_PER_DAY} requests per day`,
      remainingRequestsPerMinute: Math.max(0, RATE_LIMITS.REQUESTS_PER_MINUTE - requestsThisMinute),
      remainingRequestsPerDay: 0,
      remainingTokensPerMinute: Math.max(0, RATE_LIMITS.TOKENS_PER_MINUTE - tokensThisMinute),
      remainingTokensPerDay: Math.max(0, RATE_LIMITS.TOKENS_PER_DAY - dailyLimit.tokens),
    };
  }
  
  if (dailyLimit.tokens + estimatedTokens > RATE_LIMITS.TOKENS_PER_DAY) {
    return {
      allowed: false,
      reason: `Daily limit exceeded: ${RATE_LIMITS.TOKENS_PER_DAY} tokens per day`,
      remainingRequestsPerMinute: Math.max(0, RATE_LIMITS.REQUESTS_PER_MINUTE - requestsThisMinute),
      remainingRequestsPerDay: Math.max(0, RATE_LIMITS.REQUESTS_PER_DAY - dailyLimit.requests),
      remainingTokensPerMinute: Math.max(0, RATE_LIMITS.TOKENS_PER_MINUTE - tokensThisMinute),
      remainingTokensPerDay: 0,
    };
  }
  
  // All checks passed
  return {
    allowed: true,
    remainingRequestsPerMinute: RATE_LIMITS.REQUESTS_PER_MINUTE - requestsThisMinute - 1,
    remainingRequestsPerDay: RATE_LIMITS.REQUESTS_PER_DAY - dailyLimit.requests - 1,
    remainingTokensPerMinute: RATE_LIMITS.TOKENS_PER_MINUTE - tokensThisMinute - estimatedTokens,
    remainingTokensPerDay: RATE_LIMITS.TOKENS_PER_DAY - dailyLimit.tokens - estimatedTokens,
  };
}

/**
 * Record a request and token usage
 * @param tokensUsed - Actual tokens used in this request
 */
export async function recordUsage(tokensUsed: number = 0): Promise<void> {
  const minuteKey = getMinuteKey();
  const dayKey = getDayKey();
  
  // Record in minute window
  let minuteWindow = minuteWindows.get(minuteKey);
  if (!minuteWindow) {
    minuteWindow = {
      requests: [],
      tokens: [],
      windowStart: Date.now(),
    };
    minuteWindows.set(minuteKey, minuteWindow);
  }
  
  minuteWindow.requests.push(Date.now());
  minuteWindow.tokens.push(tokensUsed);
  
  // Record in daily limit
  let dailyLimit = dailyLimits.get(dayKey);
  if (!dailyLimit) {
    dailyLimit = {
      requests: 0,
      tokens: 0,
      date: dayKey.split(':')[1],
    };
    dailyLimits.set(dayKey, dailyLimit);
  }
  
  dailyLimit.requests += 1;
  dailyLimit.tokens += tokensUsed;
}

/**
 * Get current rate limit status
 */
export async function getRateLimitStatus(): Promise<{
  remainingRequestsPerMinute: number;
  remainingRequestsPerDay: number;
  remainingTokensPerMinute: number;
  remainingTokensPerDay: number;
  limits: typeof RATE_LIMITS;
}> {
  cleanupOldWindows();
  
  const minuteKey = getMinuteKey();
  const dayKey = getDayKey();
  
  const minuteWindow = minuteWindows.get(minuteKey) || { requests: [], tokens: [], windowStart: Date.now() };
  const dailyLimit = dailyLimits.get(dayKey) || { requests: 0, tokens: 0, date: dayKey.split(':')[1] };
  
  const requestsThisMinute = minuteWindow.requests.length;
  const tokensThisMinute = minuteWindow.tokens.reduce((sum, tokens) => sum + tokens, 0);
  
  return {
    remainingRequestsPerMinute: Math.max(0, RATE_LIMITS.REQUESTS_PER_MINUTE - requestsThisMinute),
    remainingRequestsPerDay: Math.max(0, RATE_LIMITS.REQUESTS_PER_DAY - dailyLimit.requests),
    remainingTokensPerMinute: Math.max(0, RATE_LIMITS.TOKENS_PER_MINUTE - tokensThisMinute),
    remainingTokensPerDay: Math.max(0, RATE_LIMITS.TOKENS_PER_DAY - dailyLimit.tokens),
    limits: RATE_LIMITS,
  };
}
