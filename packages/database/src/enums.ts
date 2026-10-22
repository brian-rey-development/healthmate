import { CHANNELS, DATE_PRECISIONS, KINDS, MESSAGE_ROLES } from '@healthmate/core';
import { pgEnum } from 'drizzle-orm/pg-core';

// The values come from core, so a new value in the domain makes a migration.
export const kind = pgEnum('kind', KINDS);
export const datePrecision = pgEnum('date_precision', DATE_PRECISIONS);
export const channel = pgEnum('channel', CHANNELS);
export const messageRole = pgEnum('message_role', MESSAGE_ROLES);
