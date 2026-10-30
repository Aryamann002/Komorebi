import assert from 'node:assert/strict';
import { it } from 'node:test';
import { IDEA_AREAS } from '../lib/schema.js';
import {
  IDEA_LABELS,
  countdownLabel,
  daysBetween,
  formatDate,
  formatMoney,
  formatMonth,
  groupByMonth,
  localIsoDate,
} from '../public/format.js';

it('formats money without decimals in the chosen currency', () => {
  assert.equal(formatMoney(1500000, 'INR', 'en-IN'), '₹15,00,000');
  assert.equal(formatMoney(2500, 'USD', 'en-US'), '$2,500');
});

it('formats calendar dates without timezone drift', () => {
  assert.equal(formatDate('2027-02-14', undefined, 'en-GB'), '14 Feb 2027');
});

it('formats a month heading', () => {
  assert.equal(formatMonth('2027-02-01', 'en-GB'), 'February 2027');
});

it('labels the countdown, including a plan reopened after its event', () => {
  assert.deepEqual(
    [5, 1, 0, -3].map(countdownLabel),
    ['5 days to go', '1 day to go', 'Event day is here', 'Event has passed'],
  );
});

it('has a label for every idea area the API returns', () => {
  assert.deepEqual(Object.keys(IDEA_LABELS), IDEA_AREAS);
});

it('counts whole days between ISO dates', () => {
  assert.equal(daysBetween('2026-10-20', '2027-02-14'), 117);
  assert.equal(daysBetween('2026-10-20', '2026-10-20'), 0);
});

it('returns the local calendar date as YYYY-MM-DD', () => {
  assert.match(localIsoDate(), /^\d{4}-\d{2}-\d{2}$/);
});

it('groups sorted items by month in order', () => {
  const groups = groupByMonth([{ dueDate: '2026-11-02' }, { dueDate: '2026-11-20' }, { dueDate: '2027-01-05' }]);
  assert.deepEqual(groups.map(([month, items]) => [month, items.length]), [['2026-11', 2], ['2027-01', 1]]);
});
