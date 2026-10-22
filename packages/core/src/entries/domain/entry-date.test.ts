import { describe, expect, it } from 'vitest';
import { createEntryDate, type EntryDateError, type EntryDateInput } from './entry-date';

describe('createEntryDate', () => {
  it.each([
    [{ year: 2026, month: 3, day: 14 }, '2026-03-14', 'day'],
    [{ year: 2026, month: 3 }, '2026-03-01', 'month'],
    [{ year: 2026 }, '2026-01-01', 'year'],
    [{ year: 2024, month: 2, day: 29 }, '2024-02-29', 'day'],
  ] as const)('stores %o as %s with %s precision', (input, date, precision) => {
    expect(createEntryDate(input)).toEqual({ ok: true, value: { date, precision } });
  });

  const INVALID: readonly [EntryDateInput, EntryDateError][] = [
    [{ year: 1899 }, 'invalid_year'],
    [{ year: 2026.5 }, 'invalid_year'],
    [{ year: 2026, month: 13 }, 'invalid_month'],
    [{ year: 2026, month: 0 }, 'invalid_month'],
    [{ year: 2026, month: 4, day: 31 }, 'invalid_day'],
    [{ year: 2025, month: 2, day: 29 }, 'invalid_day'],
    [{ year: 2026, day: 5 }, 'day_without_month'],
  ];

  it.each(INVALID)('rejects %o with %s', (input, error) => {
    expect(createEntryDate(input)).toEqual({ ok: false, error });
  });
});
