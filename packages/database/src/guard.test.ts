import { describe, expect, it } from 'vitest';
import { assertLocalTarget } from './guard';

describe('assertLocalTarget', () => {
  it('accepts the local stack', () => {
    expect(() => assertLocalTarget('postgresql://postgres:postgres@127.0.0.1:54322/postgres')).not.toThrow();
  });

  it('rejects a hosted project', () => {
    expect(() => assertLocalTarget('postgresql://postgres:x@db.abcd.supabase.co:5432/postgres')).toThrow(/Refusing/);
  });
});
