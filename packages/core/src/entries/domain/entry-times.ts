import { err, ok, type Result } from '../../shared/domain/result';
import type { Entry, EntryTimes } from './entry';
import { createIsoDate } from './entry-date';
import { createTimeOfDay } from './time-of-day';

export type EntryTimesError =
  | 'start_time_without_day'
  | 'end_time_without_end_date'
  | 'end_before_start'
  | 'date_invalid'
  | 'time_invalid';

const formatError = ({ startTime, endDate, endTime }: EntryTimes): 'date_invalid' | 'time_invalid' | undefined => {
  if (startTime !== null && !createTimeOfDay(startTime).ok) return 'time_invalid';
  if (endTime !== null && !createTimeOfDay(endTime).ok) return 'time_invalid';
  if (endDate !== null && !createIsoDate(endDate).ok) return 'date_invalid';
  return undefined;
};

// Zero padded ISO dates and times sort in time order, so comparing the strings compares the moments.
const endsBeforeStart = ({ start, startTime, endDate, endTime }: EntryTimes): boolean => {
  if (endDate === null) return false;
  if (endDate !== start.date) return endDate < start.date;
  return startTime !== null && endTime !== null && endTime < startTime;
};

// The same rules as the CHECK constraints, so a use case returns a clear error before the database refuses.
export const checkEntryTimes = (entry: Entry): Result<Entry, EntryTimesError> => {
  const invalid = formatError(entry);
  if (invalid) return err(invalid);
  if (entry.startTime !== null && entry.start.precision !== 'day') return err('start_time_without_day');
  if (entry.endTime !== null && entry.endDate === null) return err('end_time_without_end_date');
  if (endsBeforeStart(entry)) return err('end_before_start');
  return ok(entry);
};
