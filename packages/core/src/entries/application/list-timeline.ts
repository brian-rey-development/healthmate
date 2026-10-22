import { err, ok, type Result } from '../../shared/domain/result';
import { createIsoDate } from '../domain/entry-date';
import type { TimelineItem, TimelineRange, TimelineRepository } from '../ports/timeline-repository';

export type ListTimelineDeps = { readonly timeline: TimelineRepository };

export type ListTimelineInput = TimelineRange;

export type ListTimelineError = 'timeline_range_invalid';

export const listTimeline = async (
  { timeline }: ListTimelineDeps,
  input: ListTimelineInput,
): Promise<Result<TimelineItem[], ListTimelineError>> => {
  const from = createIsoDate(input.from);
  const to = createIsoDate(input.to);
  if (!from.ok || !to.ok) return err('timeline_range_invalid');
  if (from.value > to.value) return err('timeline_range_invalid');
  return ok(await timeline.listStartingBetween({ ...input, from: from.value, to: to.value }));
};
