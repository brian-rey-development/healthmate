import { pgEnum } from 'drizzle-orm/pg-core';

export const kind = pgEnum('kind', ['note', 'symptom']);
export const datePrecision = pgEnum('date_precision', ['day', 'month', 'year']);
export const channel = pgEnum('channel', ['telegram', 'web']);
export const messageRole = pgEnum('message_role', ['user', 'assistant', 'tool']);

export type Kind = (typeof kind.enumValues)[number];
export type SubjectKind = Exclude<Kind, 'note'>;
export type DatePrecision = (typeof datePrecision.enumValues)[number];
export type Channel = (typeof channel.enumValues)[number];
export type MessageRole = (typeof messageRole.enumValues)[number];
