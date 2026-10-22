import { describe, expect, it } from 'vitest';
import { headache } from '../testing/entries.fixtures';
import type { Entry } from './entry';
import { checkEntryTimes } from './entry-times';

const DAY = { date: '2026-03-14', precision: 'day' } as const;
const check = (overrides: Partial<Entry>) => {
  const entry: Entry = { ...headache(), start: DAY, ...overrides };
  return checkEntryTimes(entry);
};

describe('checkEntryTimes', () => {
  it('accepts an entry with a start and an end on the same day', () => {
    expect(check({ startTime: '10:00:00', endDate: '2026-03-14', endTime: '10:00:00' })).toMatchObject({ ok: true });
  });

  it('rejects an end time before the start time on the same day', () => {
    expect(check({ startTime: '10:00:00', endDate: '2026-03-14', endTime: '09:59:59' })).toEqual({
      ok: false,
      error: 'end_before_start',
    });
  });

  it('accepts an end time before the start time on a later day', () => {
    expect(check({ startTime: '10:00:00', endDate: '2026-03-15', endTime: '09:00:00' })).toMatchObject({ ok: true });
  });

  it('accepts an end date on the start day when a time is missing', () => {
    expect(check({ startTime: '10:00:00', endDate: '2026-03-14' })).toMatchObject({ ok: true });
  });

  it('rejects an end date before the start date', () => {
    expect(check({ endDate: '2026-03-13' })).toEqual({ ok: false, error: 'end_before_start' });
  });

  it('rejects a badly formed start time', () => {
    expect(check({ startTime: '10:00' })).toEqual({ ok: false, error: 'time_invalid' });
  });

  it('rejects a badly formed end date', () => {
    expect(check({ endDate: '2026-3-14' })).toEqual({ ok: false, error: 'date_invalid' });
  });
});
