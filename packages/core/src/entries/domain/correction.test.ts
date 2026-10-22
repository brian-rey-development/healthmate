import { describe, expect, it } from 'vitest';
import { headache, note } from '../testing/entries.fixtures';
import { applyCorrection } from './correction';
import type { Severity } from './severity';

const SOURCE = { messageId: 'message-9', toolUseId: 'toolu_9' };

describe('applyCorrection', () => {
  it('changes the fields, adds 1 to the version and records the new source', () => {
    const result = applyCorrection(headache(), {
      expectedVersion: 1,
      source: SOURCE,
      changes: { severity: 7 as Severity },
    });

    expect(result).toEqual({ ok: true, value: headache({ severity: 7 as Severity, version: 2, source: SOURCE }) });
  });

  it('refuses a correction based on an older version', () => {
    const result = applyCorrection(headache({ version: 3 }), { expectedVersion: 2, source: SOURCE, changes: {} });

    expect(result).toEqual({ ok: false, error: 'stale_version' });
  });

  it('refuses a severity on a note', () => {
    const result = applyCorrection(note(), {
      expectedVersion: 1,
      source: SOURCE,
      changes: { severity: 3 as Severity },
    });

    expect(result).toEqual({ ok: false, error: 'severity_on_note' });
  });
});
