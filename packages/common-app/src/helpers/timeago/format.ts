import { formatDiff, diffSec } from './utils/date';
import { getLocale } from './register';
import { Opts, TDate } from './interface';

/**
 * format a TDate into string
 * @param date
 * @param locale
 * @param opts
 */
export const formatToTimeAgo = (date: TDate, locale = 'en_short', opts?: Opts): string => {
  // diff seconds
  const sec = diffSec(date, opts && opts.relativeDate);
  // format it with locale
  return formatDiff(sec, getLocale(locale));
};

export const formatToTimeAgoWithRelativeDetail = (
  date: Date | undefined,
  keepDetailWhenIncludesDate?: boolean,
  ignoreTimeOfDay?: boolean
): string | undefined => {
  if (!date) return undefined;

  const oneHourAgo = new Date();
  oneHourAgo.setHours(oneHourAgo.getHours() - 1);
  if (date > oneHourAgo) return formatToTimeAgo(date).replaceAll('ago', '').replaceAll('just', '');

  // if date is not today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (date >= today && !ignoreTimeOfDay) {
    const timeFormat: Intl.DateTimeFormatOptions = {
      hour: 'numeric',
      minute: 'numeric',
    };
    return date.toLocaleTimeString(undefined, timeFormat);
  }

  // if date is this week
  const thisWeek = new Date();
  thisWeek.setDate(thisWeek.getDate() - thisWeek.getDay());
  if (date >= thisWeek) {
    const weekdayFormat: Intl.DateTimeFormatOptions = {
      weekday: 'short',
    };
    return date.toLocaleDateString(undefined, weekdayFormat);
  }

  const now = new Date();
  // if date is this month
  const monthsAgo = Math.abs(now.getMonth() - date.getMonth());
  if (monthsAgo === 0) {
    const dayFormat: Intl.DateTimeFormatOptions = {
      day: 'numeric',
      month: 'short',
    };
    return date.toLocaleDateString(undefined, dayFormat);
  }

  // if date not this month..
  const yearsAgo = Math.abs(new Date(now.getTime() - date.getTime()).getUTCFullYear() - 1970);
  const dateTimeFormat: Intl.DateTimeFormatOptions = {
    month: keepDetailWhenIncludesDate ? 'short' : 'numeric',
    day: 'numeric',
    year: yearsAgo !== 0 ? 'numeric' : undefined,
    hour: keepDetailWhenIncludesDate ? 'numeric' : undefined,
    minute: keepDetailWhenIncludesDate ? 'numeric' : undefined,
  };
  return date.toLocaleDateString(undefined, dateTimeFormat);
};
