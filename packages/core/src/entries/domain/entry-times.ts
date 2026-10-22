import { err, ok, type Result } from '../../shared/domain/result';
import type { EntryTimes } from './entry';

export type EntryTimesError = 'time_without_day' | 'end_time_without_end_date' | 'end_before_start';

// The same rules as the CHECK constraints, so a use case returns a clear error before the database refuses.
export const checkEntryTimes = <T extends EntryTimes>(times: T): Result<T, EntryTimesError> => {
  if (times.startTime !== null && times.start.precision !== 'day') return err('time_without_day');
  if (times.endTime !== null && times.endDate === null) return err('end_time_without_end_date');
  if (times.endDate !== null && times.endDate < times.start.date) return err('end_before_start');
  return ok(times);
};
