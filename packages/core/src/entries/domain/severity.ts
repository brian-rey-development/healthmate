import { err, ok, type Result } from '../../shared/domain/result';

declare const severityBrand: unique symbol;

// A brand, so only createSeverity can make a Severity from a number.
export type Severity = number & { readonly [severityBrand]: true };

export const MIN_SEVERITY = 0;
export const MAX_SEVERITY = 10;

export const createSeverity = (value: number): Result<Severity, 'severity_invalid'> =>
  Number.isInteger(value) && value >= MIN_SEVERITY && value <= MAX_SEVERITY
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- brand constructor, the only place a number becomes a Severity
    ? ok(value as Severity)
    : err('severity_invalid');
