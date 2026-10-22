import { describe, expect, it } from 'vitest';
import { assertLocalTarget } from './guard';

describe('assertLocalTarget', () => {
  it.each([
    ['localhost', 'postgresql://postgres:postgres@localhost:56322/postgres'],
    ['IPv4 loopback', 'postgresql://postgres:postgres@127.0.0.1:56322/postgres'],
    ['bracketed IPv6 loopback', 'postgresql://postgres:postgres@[::1]:56322/postgres'],
  ])('accepts %s', (_name, url) => {
    expect(() => assertLocalTarget(url)).not.toThrow();
  });

  it('rejects a hosted project', () => {
    expect(() => assertLocalTarget('postgresql://postgres:x@db.abcd.supabase.co:5432/postgres')).toThrow(/Refusing/);
  });

  it('rejects an IPv6 loopback without brackets, which is not a valid URL host', () => {
    expect(() => assertLocalTarget('postgresql://postgres:x@::1:5432/postgres')).toThrow();
  });

  it('rejects a host name that only starts with localhost', () => {
    expect(() => assertLocalTarget('postgresql://postgres:x@localhost.example.com:5432/postgres')).toThrow(/Refusing/);
  });
});
