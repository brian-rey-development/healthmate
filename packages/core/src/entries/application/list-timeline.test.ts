import { describe, expect, it } from 'vitest';
import { headache, note } from '../testing/entries.fixtures';
import { inMemoryTimelineRepository } from '../testing/in-memory-timeline-repository';
import type { TimelineItem } from '../ports/timeline-repository';
import { listTimeline } from './list-timeline';

const NOTE: TimelineItem = { ...note(), subjectName: null };
const HEADACHE: TimelineItem = { ...headache(), subjectName: 'Headache' };
const OTHER_USER: TimelineItem = { ...headache({ id: 'entry-3', userId: 'user-2' }), subjectName: 'Headache' };
const range = (from: string, to: string, limit = 10) => ({ userId: 'user-1', from, to, limit });
const timeline = inMemoryTimelineRepository([NOTE, HEADACHE, OTHER_USER]);

describe('listTimeline', () => {
  it('lists the entries that start in the range, newest first', async () => {
    expect(await listTimeline({ timeline }, range('2026-03-01', '2026-03-31'))).toEqual({
      ok: true,
      value: [HEADACHE, NOTE],
    });
  });

  it('leaves out the entries of another user', async () => {
    const result = await listTimeline({ timeline }, { ...range('2026-03-01', '2026-03-31'), userId: 'user-2' });

    expect(result).toEqual({ ok: true, value: [OTHER_USER] });
  });

  it('leaves out the entries that start outside the range', async () => {
    expect(await listTimeline({ timeline }, range('2026-03-02', '2026-03-13'))).toEqual({ ok: true, value: [] });
  });

  it('includes an entry that starts on the first day of the range', async () => {
    expect(await listTimeline({ timeline }, range('2026-03-14', '2026-03-31'))).toEqual({ ok: true, value: [HEADACHE] });
  });

  it('includes an entry that starts on the last day of the range', async () => {
    expect(await listTimeline({ timeline }, range('2026-03-01', '2026-03-01'))).toEqual({ ok: true, value: [NOTE] });
  });

  it('applies the limit to the newest entries', async () => {
    expect(await listTimeline({ timeline }, range('2026-03-01', '2026-03-31', 1))).toEqual({
      ok: true,
      value: [HEADACHE],
    });
  });

  it('rejects a range that ends before it starts', async () => {
    expect(await listTimeline({ timeline }, range('2026-04-01', '2026-03-01'))).toEqual({
      ok: false,
      error: 'timeline_range_invalid',
    });
  });

  it.each([
    ['2026-02-30', '2026-03-31'],
    ['2026-03-01', 'tomorrow'],
  ])('rejects the invalid date range %s to %s', async (from, to) => {
    expect(await listTimeline({ timeline }, range(from, to))).toEqual({ ok: false, error: 'timeline_range_invalid' });
  });
});
