import type { Entry } from '../domain/entry';

export const copyEntry = <T extends Entry>(entry: T): T => ({
  ...entry,
  start: { ...entry.start },
  source: { ...entry.source },
});
