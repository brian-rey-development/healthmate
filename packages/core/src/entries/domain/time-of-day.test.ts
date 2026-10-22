import { describe, expect, it } from 'vitest';
import { createTimeOfDay } from './time-of-day';

describe('createTimeOfDay', () => {
  it.each(['00:00:00', '15:30:45', '23:59:59'])('accepts %s', (value) => {
    expect(createTimeOfDay(value)).toEqual({ ok: true, value });
  });

  it.each(['24:00:00', '12:60:00', '12:00:60', '1:00:00', '12:00', '12:00:00Z', '', 'noon'])('rejects %s', (value) => {
    expect(createTimeOfDay(value)).toEqual({ ok: false, error: 'time_invalid' });
  });
});
