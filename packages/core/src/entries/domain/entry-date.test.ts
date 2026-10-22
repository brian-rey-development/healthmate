import { describe, expect, it } from 'vitest';
import { createEntryDate, createIsoDate, type EntryDateError, type EntryDateInput } from './entry-date';

describe('createEntryDate', () => {
  it.each([
    [{ year: 2026, month: 3, day: 14 }, '2026-03-14', 'day'],
    [{ year: 2026, month: 3 }, '2026-03-01', 'month'],
    [{ year: 2026 }, '2026-01-01', 'year'],
    [{ year: 2024, month: 2, day: 29 }, '2024-02-29', 'day'],
    [{ year: 2000, month: 2, day: 29 }, '2000-02-29', 'day'],
    [{ year: 1900 }, '1900-01-01', 'year'],
    [{ year: 2100 }, '2100-01-01', 'year'],
    [{ year: 2026, month: 12 }, '2026-12-01', 'month'],
  ] as const)('stores %o as %s with %s precision', (input, date, precision) => {
    expect(createEntryDate(input)).toEqual({ ok: true, value: { date, precision } });
  });

  const INVALID: readonly [EntryDateInput, EntryDateError][] = [
    [{ year: 1899 }, 'year_invalid'],
    [{ year: 2101 }, 'year_invalid'],
    [{ year: 2026.5 }, 'year_invalid'],
    [{ year: Number.NaN }, 'year_invalid'],
    [{ year: 2026, month: 13 }, 'month_invalid'],
    [{ year: 2026, month: 0 }, 'month_invalid'],
    [{ year: 2026, month: Number.NaN }, 'month_invalid'],
    [{ year: 2026, month: 4, day: 31 }, 'day_invalid'],
    [{ year: 2026, month: 4, day: 0 }, 'day_invalid'],
    [{ year: 2026, month: 4, day: Number.NaN }, 'day_invalid'],
    [{ year: 2025, month: 2, day: 29 }, 'day_invalid'],
    [{ year: 1900, month: 2, day: 29 }, 'day_invalid'],
    [{ year: 2026, day: 5 }, 'day_without_month'],
  ];

  it.each(INVALID)('rejects %o with %s', (input, error) => {
    expect(createEntryDate(input)).toEqual({ ok: false, error });
  });
});

describe('createIsoDate', () => {
  it.each(['2026-03-14', '2024-02-29', '1900-01-01', '2100-12-31'])('accepts %s', (value) => {
    expect(createIsoDate(value)).toEqual({ ok: true, value });
  });

  it.each(['2026-02-30', '2025-02-29', '2026-13-01', '2026-00-10', '2026-3-14', '14-03-2026', '2026-03-14T10:00', '', 'today'])(
    'rejects %s',
    (value) => {
      expect(createIsoDate(value)).toEqual({ ok: false, error: 'date_invalid' });
    },
  );
});
