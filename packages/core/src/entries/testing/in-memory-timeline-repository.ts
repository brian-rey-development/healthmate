import { compareText } from '../../shared/domain/compare-text';
import { requireLimit } from '../../shared/domain/require-limit';
import type { TimelineItem, TimelineRepository } from '../ports/timeline-repository';
import { copyEntry } from './copy-entry';

const newestFirst = (a: TimelineItem, b: TimelineItem): number =>
  compareText(b.start.date, a.start.date) || compareText(a.id, b.id);

export const inMemoryTimelineRepository = (seed: readonly TimelineItem[] = []): TimelineRepository => {
  const items = seed.map(copyEntry);
  return {
    listStartingBetween: async ({ userId, from, to, limit }) =>
      items
        .filter((item) => item.userId === userId && item.start.date >= from && item.start.date <= to)
        .toSorted(newestFirst)
        .slice(0, requireLimit(limit))
        .map(copyEntry),
  };
};
