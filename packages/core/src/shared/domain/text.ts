import { err, ok, type Result } from './result';

// NFC makes 2 spellings of the same visible name one string, so length limits and uniqueness agree.
export const createBoundedText = <E extends string>(
  value: string,
  maxLength: number,
  error: E,
): Result<string, E> => {
  const text = value.trim().normalize('NFC');
  return text.length > 0 && text.length <= maxLength ? ok(text) : err(error);
};
