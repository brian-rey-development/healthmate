import { describe, expect, it } from 'vitest';
import { createBoundedText } from './text';

describe('createBoundedText', () => {
  it('trims the text', () => {
    expect(createBoundedText('  Ana ', 10, 'bad')).toEqual({ ok: true, value: 'Ana' });
  });

  it('joins a letter and its accent into one character', () => {
    expect(createBoundedText('José', 4, 'bad')).toEqual({ ok: true, value: 'José' });
  });

  it('rejects blank text', () => {
    expect(createBoundedText('   ', 10, 'bad')).toEqual({ ok: false, error: 'bad' });
  });
});
