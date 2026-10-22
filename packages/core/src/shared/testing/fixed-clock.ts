import type { Clock } from '../ports/clock';

export const fixedClock = (at: Date): Clock => ({ now: () => at });
