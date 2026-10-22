import { err, ok, type Result } from '../../shared/domain/result';

declare const severityBrand: unique symbol;

// A brand, so only createSeverity can make a Severity from a number.
export type Severity = number & { readonly [severityBrand]: true };

export const MIN_SEVERITY = 0;
export const MAX_SEVERITY = 10;

export const createSeverity = (value: number): Result<Severity, 'invalid_severity'> =>
  Number.isInteger(value) && value >= MIN_SEVERITY && value <= MAX_SEVERITY
    ? ok(value as Severity)
    : err('invalid_severity');
