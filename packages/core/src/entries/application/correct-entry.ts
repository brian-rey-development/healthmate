import { err, type Result } from '../../shared/domain/result';
import type { Clock } from '../../shared/ports/clock';
import { applyCorrection, type Correction, type CorrectionError } from '../domain/correction';
import type { Entry } from '../domain/entry';
import type { EntriesRepository } from '../ports/entries-repository';

export type CorrectEntryDeps = { readonly entries: EntriesRepository; readonly clock: Clock };

export type CorrectEntryInput = Correction & { readonly userId: string; readonly entryId: string };

export type CorrectEntryError = 'entry_not_found' | CorrectionError;

export const correctEntry = async (
  { entries, clock }: CorrectEntryDeps,
  input: CorrectEntryInput,
): Promise<Result<Entry, CorrectEntryError>> => {
  const current = await entries.findById(input.userId, input.entryId);
  if (!current) return err('entry_not_found');
  const corrected = applyCorrection(current, input);
  if (!corrected.ok) return corrected;
  const saved = await entries.correct({ entry: corrected.value, updatedAt: clock.now() });
  return saved ? corrected : err('entry_version_stale');
};
