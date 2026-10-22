import { err, ok, type Result } from '../../shared/domain/result';

export const DATE_PRECISIONS = ['day', 'month', 'year'] as const;

export type DatePrecision = (typeof DATE_PRECISIONS)[number];

export type EntryDate = { readonly date: string; readonly precision: DatePrecision };

export type EntryDateInput = {
  readonly year: number;
  readonly month?: number | undefined;
  readonly day?: number | undefined;
};

export type EntryDateError = 'year_invalid' | 'month_invalid' | 'day_invalid' | 'day_without_month';

const MIN_YEAR = 1900;
const MAX_YEAR = 2100;
const FIRST_MONTH = 1;
const FIRST_DAY = 1;
const MONTHS_IN_YEAR = 12;
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const FEBRUARY = 2;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

const isLeapYear = (year: number): boolean => (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;

const daysInMonth = (year: number, month: number): number =>
  month === FEBRUARY && isLeapYear(year) ? 29 : (DAYS_IN_MONTH[month - 1] ?? 0);

const isInRange = (value: number, min: number, max: number): boolean =>
  Number.isInteger(value) && value >= min && value <= max;

const precisionOf = ({ month, day }: EntryDateInput): DatePrecision => {
  if (day !== undefined) return 'day';
  return month === undefined ? 'year' : 'month';
};

const pad = (value: number): string => String(value).padStart(2, '0');

// A month or a year is stored as its first day, so dates of every precision sort on one column.
export const createEntryDate = (input: EntryDateInput): Result<EntryDate, EntryDateError> => {
  const { year, month: inputMonth, day: inputDay } = input;
  if (!isInRange(year, MIN_YEAR, MAX_YEAR)) return err('year_invalid');
  if (inputDay !== undefined && inputMonth === undefined) return err('day_without_month');
  const month = inputMonth ?? FIRST_MONTH;
  const day = inputDay ?? FIRST_DAY;
  if (!isInRange(month, FIRST_MONTH, MONTHS_IN_YEAR)) return err('month_invalid');
  if (!isInRange(day, FIRST_DAY, daysInMonth(year, month))) return err('day_invalid');
  return ok({ date: `${String(year).padStart(4, '0')}-${pad(month)}-${pad(day)}`, precision: precisionOf(input) });
};

export const createIsoDate = (value: string): Result<string, 'date_invalid'> => {
  const match = ISO_DATE.exec(value);
  if (!match) return err('date_invalid');
  const [, year, month, day] = match;
  const date = createEntryDate({ year: Number(year), month: Number(month), day: Number(day) });
  return date.ok ? ok(date.value.date) : err('date_invalid');
};
