import { err, ok, type Result } from '../../shared/domain/result';

export type DatePrecision = 'day' | 'month' | 'year';

export type EntryDate = { readonly date: string; readonly precision: DatePrecision };

export type EntryDateInput = { readonly year: number; readonly month?: number; readonly day?: number };

export type EntryDateError = 'invalid_year' | 'invalid_month' | 'invalid_day' | 'day_without_month';

const MIN_YEAR = 1900;
const MAX_YEAR = 2100;
const MONTHS_IN_YEAR = 12;
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const FEBRUARY = 2;

const isLeapYear = (year: number): boolean => (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;

const daysInMonth = (year: number, month: number): number =>
  month === FEBRUARY && isLeapYear(year) ? 29 : (DAYS_IN_MONTH[month - 1] ?? 0);

const isInRange = (value: number, min: number, max: number): boolean =>
  Number.isInteger(value) && value >= min && value <= max;

const precisionOf = ({ month, day }: EntryDateInput): DatePrecision => {
  if (day !== undefined) return 'day';
  return month === undefined ? 'year' : 'month';
};

const pad = (value: number, width = 2): string => String(value).padStart(width, '0');

// A month or a year is stored as its first day, so dates of every precision sort on one column.
export const createEntryDate = (input: EntryDateInput): Result<EntryDate, EntryDateError> => {
  const { year, month = 1, day = 1 } = input;
  if (!isInRange(year, MIN_YEAR, MAX_YEAR)) return err('invalid_year');
  if (input.day !== undefined && input.month === undefined) return err('day_without_month');
  if (!isInRange(month, 1, MONTHS_IN_YEAR)) return err('invalid_month');
  if (!isInRange(day, 1, daysInMonth(year, month))) return err('invalid_day');
  return ok({ date: `${pad(year, 4)}-${pad(month)}-${pad(day)}`, precision: precisionOf(input) });
};
