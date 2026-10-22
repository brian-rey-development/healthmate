import { describe, expect, it } from 'vitest';
import { createIds } from './ids';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const START_MS = Date.UTC(2026, 2, 14, 10, 0, 0);
const SAMPLE_SIZE = 200;
const clockAt = (ms: number) => ({ now: () => new Date(ms) });
const timestampOf = (id: string) => Number.parseInt(id.replaceAll('-', '').slice(0, 12), 16);

describe('createIds', () => {
  it('formats the id as a UUID', () => {
    expect(createIds(clockAt(START_MS)).next()).toMatch(UUID_PATTERN);
  });

  it('sets version 7 and the RFC variant bits', () => {
    const ids = createIds(clockAt(START_MS));
    for (let i = 0; i < SAMPLE_SIZE; i += 1) {
      const id = ids.next();
      expect(id[14]).toBe('7');
      expect(id[19]).toMatch(/^[89ab]$/);
    }
  });

  it('encodes the clock milliseconds in the first 48 bits', () => {
    expect(timestampOf(createIds(clockAt(START_MS)).next())).toBe(START_MS);
  });

  it('sorts ids in time order when the clock moves forward', () => {
    let now = START_MS;
    const ids = createIds({ now: () => new Date(now) });
    const made = Array.from({ length: SAMPLE_SIZE }, () => {
      now += 1;
      return ids.next();
    });
    expect([...made].sort()).toEqual(made);
  });

  it('gives different ids at the same millisecond', () => {
    const ids = createIds(clockAt(START_MS));
    expect(ids.next()).not.toBe(ids.next());
  });
});
