import { describe, expect, it } from 'vitest';
import { headache, note } from '../testing/entries.fixtures';
import { inMemoryTimelineRepository } from '../testing/in-memory-timeline-repository';
import { listTimeline } from './list-timeline';

const timeline = inMemoryTimelineRepository([
  { ...note(), subjectName: null },
  { ...headache(), subjectName: 'Headache' },
]);

describe('listTimeline', () => {
  it('lists the entries that start in the range, newest first', async () => {
    const result = await listTimeline({ timeline }, { userId: 'user-1', from: '2026-03-01', to: '2026-03-31' });

    expect(result.ok && result.value.map((item) => item.id)).toEqual(['entry-1', 'entry-2']);
  });

  it('rejects a range that ends before it starts', async () => {
    expect(await listTimeline({ timeline }, { userId: 'user-1', from: '2026-04-01', to: '2026-03-01' })).toEqual({
      ok: false,
      error: 'invalid_range',
    });
  });
});
