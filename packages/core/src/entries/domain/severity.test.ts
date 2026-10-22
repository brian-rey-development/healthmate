import { describe, expect, it } from 'vitest';
import { createSeverity } from './severity';

describe('createSeverity', () => {
  it.each([0, 6, 10])('accepts %d', (value) => {
    expect(createSeverity(value)).toEqual({ ok: true, value });
  });

  it.each([-1, 11, 6.5, Number.NaN])('rejects %d', (value) => {
    expect(createSeverity(value)).toEqual({ ok: false, error: 'severity_invalid' });
  });
});
