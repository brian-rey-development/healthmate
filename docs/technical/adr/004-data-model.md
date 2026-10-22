# ADR-004 Data model for entries, conversations and tool calls

Accepted on 2026-10-22. The tables are in `docs/technical/data-schema.dbml`. Amends ADR-003 about triggers.

## Context

v0.1 logs notes and symptoms. Later releases add visits, labs, protocols and hypotheses. The product has 4 rules that decide the model.

- History is never lost. A correction keeps the old data.
- Time is never invented. Vague time stays vague.
- The agent proposes, and the person confirms.
- Each answer cites the records that it uses.

The model must also work for an agent. A model selects well from a short list and fills a fixed form well. It does not keep a long open list consistent over months.

## Decision

**Entry shape.** An entry has a kind, a subject, a value, a time and the original words of the person. HL7 FHIR uses the same shape for its Observation resource.

**Kind.** The kind is a short fixed list of generic kinds, stored as a Postgres enum. In v0.1 the list is `note` and `symptom`. Each kind needs a zod schema and its required fields in code, so a table of kinds has no use. A kind for each specific thing, such as "magnesium", is not permitted.

**Subject.** The subject is the standard name, for example "headache". All standard name work happens in the `subjects` table.

- A seed subject has no `user_id`, and all users see it.
- A subject that a person adds is private, because a subject name is health data.
- Each subject has one kind. A composite foreign key `(subject_id, kind)` makes sure that an entry and its subject have the same kind.
- The agent finds a subject with the tool `search_subjects`, which uses `pg_trgm`. The agent proposes a new subject when no subject matches, and the person confirms it.

**Value.** The value is one `jsonb` column. A zod schema for each kind checks it before the save. A new kind needs no migration. One person has some thousands of rows, so reads inside JSON are fast.

**Note.** A note is a kind of entry with no subject. Every entry also keeps `original_words`, so the app shows the words of the person.

**Time.** A start date is necessary. The agent asks for the day once. If the person does not know the day, the entry keeps month or year precision. Start time and end time are optional. An entry with no end stays open. A later message such as "headache gone" adds the end time as a correction. The product sends no reminders.

**Follow-up.** New data about the same symptom, such as "worse now, 8", is a new entry with the same subject. It is not a correction, because the old value was true at its time. v0.1 has no link between the 2 entries.

**History.** `entries` holds the current data, so the timeline reads one table. A correction updates the row and adds 1 to `version`. A trigger copies each insert and each update into `entry_history`. Thus no code path can change an entry and skip the history. No delete is permitted on `entries`.

**Messages.** A message has a `role` (`user`, `assistant` or `tool`) and `content`, a list of `text`, `tool_use` and `tool_result` blocks. This is the shape of the LLM APIs, so the app sends the history to the model with no conversion. The system prompt is a versioned file, and each assistant message stores its `model` and `prompt_version`.

**Tool calls.** Each tool call is a row in `tool_calls`, the reads included. A proposal is a tool call with the status `pending`. The Confirm and Discard buttons give its result. The web form makes the same tool calls with `made_by = person`, so the agent and the form use one path.

**Double confirm.** A confirm changes the status from `pending` to `confirmed` with one conditional `UPDATE`. A second confirm changes 0 rows, and the app returns the existing entry. `entry_history.tool_call_id` is unique, so the database also blocks a second version from one tool call.

**Outdated correction.** A correction updates the entry only if `version` is still the version that the agent read. If not, the agent drafts the correction again.

**Citations.** A citation points to `(entry_id, version)` in `entry_history`. An old answer still shows the data that it used.

**Trigger exception to ADR-003.** ADR-003 does not permit triggers, because a trigger writes outside `core`. The history trigger is an exception. It makes no domain decision and only copies a row. The rule stays for all other writes.

## Rejected options

- **One table for each kind.** A correction that changes the kind moves a row to a different table.
- **An identity table plus a versions table.** Each read needs a join and a "latest version" filter.
- **An event log.** Each read needs a replay or a second table for the current state.
- **A drafts table.** The pending tool call already holds the draft.
- **A global subject list only.** A new subject name from one person is visible to all users.

## Consequences

- The timeline query reads `entries` only.
- A new kind needs a zod schema, an enum value and a migration for the enum. It needs no new table.
- The history trigger lives in a custom SQL migration, because Drizzle does not generate triggers.
- From v0.2 the app encrypts entry data before the save. Then SQL cannot read inside `value`, and filters move to code. If subject names are also encrypted, `search_subjects` moves to code.
- The history is insert only. A decision about the legal right to erasure is necessary before v0.2.
