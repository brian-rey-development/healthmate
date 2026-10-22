import type { TimelineItem, TimelineRepository } from '../ports/timeline-repository';

export const inMemoryTimelineRepository = (items: readonly TimelineItem[] = []): TimelineRepository => ({
  listStartingBetween: async ({ userId, from, to }) =>
    items
      .filter((item) => item.userId === userId && item.start.date >= from && item.start.date <= to)
      .toSorted((a, b) => b.start.date.localeCompare(a.start.date)),
});
