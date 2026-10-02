/**
 * Taiwan Timezone (UTC+8 / Asia/Taipei) Standardized Utilities
 * Ensures consistent date and time calculations across all environments (Desktop, Mobile, CI, Cloudflare Pages).
 */

export const TAIWAN_TIMEZONE = 'Asia/Taipei';

/**
 * Safely parse date input into Date object
 */
function parseDateInput(input?: Date | string | number | null): Date {
  if (!input) return new Date();
  if (input instanceof Date) return input;
  if (typeof input === 'number') return new Date(input);
  if (typeof input === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
      return new Date(`${input}T00:00:00+08:00`);
    }
    return new Date(input);
  }
  return new Date();
}

/**
 * Format a Date, timestamp number, or ISO string to Taiwan date string 'YYYY-MM-DD'
 * If input is already 'YYYY-MM-DD', returns it directly.
 */
export function getTaiwanDateStr(input?: Date | string | number | null): string {
  if (typeof input === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
    return input;
  }
  const d = parseDateInput(input);
  if (isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TAIWAN_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

/**
 * Returns today's date in Taiwan timezone 'YYYY-MM-DD'
 */
export function getTaiwanTodayStr(): string {
  return getTaiwanDateStr(new Date());
}

/**
 * Returns yesterday's date in Taiwan timezone 'YYYY-MM-DD'
 */
export function getTaiwanYesterdayStr(): string {
  return getTaiwanDaysAgoStr(1);
}

/**
 * Returns date string 'YYYY-MM-DD' for N days ago in Taiwan timezone
 */
export function getTaiwanDaysAgoStr(days: number): string {
  const todayStr = getTaiwanTodayStr();
  const [y, m, d] = todayStr.split('-').map(Number);
  // Using UTC 04:00 corresponds to 12:00 PM Taiwan time (safe from any edge boundary)
  const targetDate = new Date(Date.UTC(y, m - 1, d - days, 4, 0, 0));
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TAIWAN_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(targetDate);
}

/**
 * Format timestamp into Taiwan 24-hour time 'HH:mm' or 'HH:mm:ss'
 */
export function getTaiwanTimeStr(
  input?: Date | string | number | null,
  includeSeconds = false
): string {
  const d = parseDateInput(input);
  if (isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('zh-TW', {
    timeZone: TAIWAN_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    ...(includeSeconds ? { second: '2-digit' } : {}),
    hour12: false,
  }).format(d);
}

/**
 * Format timestamp into readable Taiwan date-time string 'YYYY-MM-DD HH:mm' (or with seconds)
 */
export function getTaiwanDateTimeStr(
  input?: Date | string | number | null,
  includeSeconds = false
): string {
  const dateStr = getTaiwanDateStr(input);
  const timeStr = getTaiwanTimeStr(input, includeSeconds);
  if (!dateStr) return '';
  return timeStr ? `${dateStr} ${timeStr}` : dateStr;
}

/**
 * Creates an ISO timestamp with explicit +08:00 offset, or standard ISO
 */
export function createTaiwanTimestamp(dateStr?: string, timeStr?: string): string {
  if (dateStr && timeStr) {
    return new Date(`${dateStr}T${timeStr}:00+08:00`).toISOString();
  }
  return new Date().toISOString();
}
