import { err, ok, type Result } from '../../shared/domain/result';

const TIME_OF_DAY = /^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/;

export const createTimeOfDay = (value: string): Result<string, 'time_invalid'> =>
  TIME_OF_DAY.test(value) ? ok(value) : err('time_invalid');
