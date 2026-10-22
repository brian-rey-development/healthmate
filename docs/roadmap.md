# HealthMate roadmap

This document lists every release, tracks progress, and holds the engineering rules that apply across all of them. What HealthMate is and how it behaves lives in `docs/product.md`. Each release has its own plan in `docs/releases/`, and that file also becomes its release notes when it ships. Architecture and code conventions live in `docs/technical/architecture.md`.

## Progress

| Version | Theme | Status | Started | Shipped |
|---|---|---|---|---|
| [v0.1](releases/v0.1.md) | Capture | In progress | 2026-10-22 | |
| [v0.2](releases/v0.2.md) | Lock it down | Not started | | |
| [v0.3](releases/v0.3.md) | Visits | Not started | | |
| [v0.4](releases/v0.4.md) | Labs, manual | Not started | | |
| [v0.5](releases/v0.5.md) | Labs, extracted | Not started | | |
| [v0.6](releases/v0.6.md) | Experiments | Not started | | |
| [v0.7](releases/v0.7.md) | Ask | Not started | | |
| [v0.8](releases/v0.8.md) | Visit brief | Not started | | |
| [v1.0](releases/v1.0.md) | Production | Not started | | |

**Status values.** Not started, In progress, In review, Shipped.

**How progress is tracked.** Each release file has decisions, a work plan and acceptance criteria as checklists. A box is checked in the same PR that makes it true. A release is Shipped only when every acceptance box is checked and its release checklist is complete. Unchecking a box after shipping means a regression, and it gets fixed before the next release starts. Only one release is In progress at a time.

## Releases at a glance

| Version | What ships | Real data? |
|---|---|---|
| v0.1 | Notes and symptoms by text or voice, agent proposes and asks, user confirms, corrections, timeline, read-only questions, Telegram and web | No, synthetic only |
| v0.2 | Auth, envelope encryption, audit log, encrypted backups, provider data policies | Yes, starts here |
| v0.3 | Encounters with pre and post notes, encrypted file uploads | Yes |
| v0.4 | Manual lab entry, analyte catalog, trends per analyte | Yes |
| v0.5 | Extraction from PDFs, review screen, extraction evals | Yes |
| v0.6 | Protocols, hypotheses with a target metric, before and after view | Yes |
| v0.7 | Full read agent across all record types, citations, eval suites | Yes |
| v0.8 | Generated summary for a doctor, editable and exportable | Yes |
| v1.0 | Cloud deploy, real KMS, backups, observability, SLOs | Yes |

---

# Rules that apply to every release

Product principles, personality and safety rules live in `docs/product.md` and apply to every release. The rules below are the engineering guardrails that enforce them.

## Guardrails

These apply from v0.1 onward and only ever get stricter.

**Input**

- Vague magnitudes ("pretty bad") are asked about, never converted to numbers.
- The raw transcript is shown on every proposal created from voice.
- An ambiguous reference to an existing record produces a question, never a guess.
- Imprecise time is stored with its real precision. No time at all means it happened now.

**Agent behavior**

- Tool arguments are validated in code. Invalid arguments are returned to the model, never repaired.
- Required fields are defined by the domain, not the prompt. The UI and the agent ask for exactly the same things.
- Every turn has a step limit, a token limit and a timeout. Hitting one ends the turn with a visible failure.
- Stored content reaches the model only inside tool results, clearly delimited. Instructions inside stored content are never followed.
- Read tools return capped results. No tool returns the entire timeline.

**Writes**

- The agent can only create proposals. Only the domain persists, and only after confirmation.
- Confirmation is idempotent. Confirming twice creates one record.
- Proposals expire.
- A correction proposal is rejected if the record changed after it was drafted.
- Every agent-created record stores the model, prompt version and source transcript.

**Reads**

- Every cited record id must have come from a tool result in the same turn, verified in code. Answers that fail are rejected.
- Agent reads are audited exactly like user reads.

## Security and privacy

**Data handling**

- Synthetic data only until v0.2 is shipped.
- Two environments, demo and personal (ADR-003). Demo is the local Supabase stack and personal is a separate hosted Supabase project. Tests, seeds and evals refuse to run against anything but the local stack.
- Logs and traces never contain record content, transcripts or prompts. They contain ids, kinds, durations and error names.
- Audio is discarded after transcription. The transcript is the source.
- Health data goes to model providers only to answer the current request, only the minimum needed, and only to providers with zero data retention.

**From v0.2 onward**

- Envelope encryption with a data key per user, wrapped by a master key behind a provider interface.
- Record payloads, transcripts and files are encrypted at the application layer.
- Row level security in Postgres as a second line of defense. Since v0.1 every app table has RLS enabled with no policies, which denies everything outside `apps/api` (ADR-003). v0.2 adds per-user policies.
- Passkey authentication.
- Every read of decrypted content, every proposal, every confirmation and every export is in the audit log, and the person can see it.
- Encrypted backups with a tested restore.

**Channels**

- Telegram has no end-to-end encryption for bots, so content passes through third-party servers. Before v0.2 ships, decide whether Telegram stays synthetic-only or whether that risk is accepted explicitly in the threat model.

## Evals

Every release that changes model behavior adds or updates eval suites. Evals run separately from tests and their summaries are committed under `packages/evals/results/`.

| Suite | Measures | Introduced |
|---|---|---|
| Capture | Correct proposal from text and voice | v0.1 |
| Clarify | Asks for exactly the missing required fields, nothing more | v0.1 |
| Corrections | Finds the right record or asks, never guesses | v0.1 |
| Reads | Correct answer with valid citations | v0.1 |
| Safety | Refuses diagnosis and advice, triggers red flags | v0.1 |
| Personality | Tone, brevity, no forbidden language | v0.1 |
| Extraction | Field-level precision and recall on lab reports | v0.5 |
| Experiments | Honest before and after statements | v0.6 |
| Brief | Every claim in a visit brief is traceable | v0.8 |

**Release-blocking thresholds**

- Safety has zero failures.
- Citations are 100% valid.
- Every other suite has no regression against the previous release. The report includes cost and latency.

If a model judge is used, it's calibrated against at least 50 human labels and its agreement rate is reported.

## Release checklist

Every release file ends with this list, and it is checked there.

- [ ] Every acceptance criterion for the release is checked
- [ ] All eval suites pass their thresholds, summaries committed
- [ ] Typecheck, lint, boundaries and tests pass on main
- [ ] ADRs written for every decision made during the release
- [ ] Threat model updated if the attack surface changed
- [ ] Release notes section of the release file filled in
- [ ] Version tagged
- [ ] Demo recorded
- [ ] Progress table updated
