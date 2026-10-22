-- Trigram search for subjects.name. Drizzle Kit does not create extensions, so this runs before the tables.
create extension if not exists pg_trgm with schema extensions;
