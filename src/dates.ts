const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Turns "2026-03-09" into "Mar 9, 2026" without going through a Date object. */
export function formatDueDate(dueDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dueDate);
  const month = match ? MONTHS[Number(match[2]) - 1] : undefined;
  if (!match || !month) throw new Error(`Not a calendar date: ${dueDate}`);
  return `${month} ${Number(match[3])}, ${match[1]}`;
}

/** The business works in New York time. "Today" and "overdue" are decided there. */
export const BUSINESS_TIME_ZONE = 'America/New_York';

/**
 * Today's calendar date, written YYYY-MM-DD, in the given time zone.
 * It does not depend on the machine's time zone.
 */
export function todayIn(timeZone: string, now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes): string => {
    const value = parts.find((p) => p.type === type)?.value;
    if (!value) throw new Error(`No ${type} in the date for ${timeZone}`);
    return value;
  };
  return `${part('year')}-${part('month')}-${part('day')}`;
}
