import { createBoundedText } from '../../shared/domain/text';
import type { Result } from '../../shared/domain/result';

export type User = { readonly id: string; readonly displayName: string };

export const MAX_DISPLAY_NAME_LENGTH = 80;

export const createDisplayName = (value: string): Result<string, 'invalid_display_name'> =>
  createBoundedText(value, MAX_DISPLAY_NAME_LENGTH, 'invalid_display_name');
