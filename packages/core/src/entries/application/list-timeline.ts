import { err, ok, type Result } from '../../shared/domain/result';
import type { TimelineItem, TimelineRange, TimelineRepository } from '../ports/timeline-repository';

export type ListTimelineDeps = { readonly timeline: TimelineRepository };

export const listTimeline = async (
  { timeline }: ListTimelineDeps,
  range: TimelineRange,
): Promise<Result<TimelineItem[], 'invalid_range'>> =>
  range.from > range.to ? err('invalid_range') : ok(await timeline.listStartingBetween(range));
