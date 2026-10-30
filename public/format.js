const DAY_MS = 24 * 60 * 60 * 1000;

/** Display names for IDEA_AREAS in lib/schema.js; test/format.test.js keeps the two in step. */
export const IDEA_LABELS = {
  theme: 'Theme',
  decor: 'Decor',
  food: 'Food & drink',
  activities: 'Activities',
  'guest-experience': 'Guest experience',
};

/** @param {number} amount @param {string} currency @param {string} [locale] */
export const formatMoney = (amount, currency, locale) =>
  new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);

/**
 * Dates are calendar days, so they are parsed and printed in UTC to avoid
 * shifting by a day in timezones west of Greenwich.
 * @param {string} isoDate @param {Intl.DateTimeFormatOptions} [options] @param {string} [locale]
 */
export const formatDate = (isoDate, options = { day: 'numeric', month: 'short', year: 'numeric' }, locale) =>
  new Intl.DateTimeFormat(locale, { ...options, timeZone: 'UTC' }).format(Date.parse(isoDate));

/** @param {string} isoDate */
export const formatMonth = (isoDate, locale) => formatDate(isoDate, { month: 'long', year: 'numeric' }, locale);

/** @param {string} eventDate @param {string} today Both ISO dates. */
export const daysBetween = (today, eventDate) => Math.round((Date.parse(eventDate) - Date.parse(today)) / DAY_MS);

/** A saved plan can be reopened after its event, so past dates need their own wording. @param {number} daysLeft */
export function countdownLabel(daysLeft) {
  if (daysLeft > 1) return `${daysLeft} days to go`;
  if (daysLeft === 1) return '1 day to go';
  return daysLeft === 0 ? 'Event day is here' : 'Event has passed';
}

/** Today's calendar date in the viewer's own timezone, as YYYY-MM-DD. */
export function localIsoDate(date = new Date()) {
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 10);
}

/**
 * Groups already-sorted items by calendar month, preserving order.
 * @template {{ dueDate: string }} T
 * @param {T[]} items
 * @returns {[string, T[]][]} Month key (YYYY-MM) with its items.
 */
export function groupByMonth(items) {
  const groups = new Map();
  for (const item of items) {
    const month = item.dueDate.slice(0, 7);
    if (!groups.has(month)) groups.set(month, []);
    groups.get(month).push(item);
  }
  return [...groups];
}
