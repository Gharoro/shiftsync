import { formatInTimeZone, toZonedTime } from 'date-fns-tz';
import { getDay } from 'date-fns';

export function formatInTimezone(
  utcDate: string,
  timezone: string,
  formatStr: string
): string {
  return formatInTimeZone(new Date(utcDate), timezone, formatStr);
}

export function getLocalDayOfWeek(utcDate: string, timezone: string): number {
  const zoned = toZonedTime(new Date(utcDate), timezone);
  return getDay(zoned);
}
