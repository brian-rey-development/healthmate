import { err, ok, type Result } from './result';

// Trims the text and checks its length, for names that a person types.
export const createBoundedText = <E extends string>(
  value: string,
  maxLength: number,
  error: E,
): Result<string, E> => {
  const text = value.trim();
  return text.length > 0 && text.length <= maxLength ? ok(text) : err(error);
};
