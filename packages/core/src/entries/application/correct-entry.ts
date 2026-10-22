import { err, type Result } from '../../shared/domain/result';
import type { Clock } from '../../shared/ports/clock';
import { applyCorrection, type Correction, type CorrectionError } from '../domain/correction';
import type { Entry } from '../domain/entry';
import type { EntriesRepository } from '../ports/entries-repository';

export type CorrectEntryDeps = { readonly entries: EntriesRepository; readonly clock: Clock };

export type CorrectEntryInput = Correction & { readonly userId: string; readonly entryId: string };

export type CorrectEntryError = 'not_found' | CorrectionError;

export const correctEntry = async (
  { entries, clock }: CorrectEntryDeps,
  input: CorrectEntryInput,
): Promise<Result<Entry, CorrectEntryError>> => {
  const entry = await entries.findById(input.userId, input.entryId);
  if (!entry) return err('not_found');
  const corrected = applyCorrection(entry, input);
  if (!corrected.ok) return corrected;
  const correction = { entry: corrected.value, expectedVersion: input.expectedVersion, updatedAt: clock.now() };
  return (await entries.correct(correction)) ? corrected : err('stale_version');
};
