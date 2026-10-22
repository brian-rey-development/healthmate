# Threat model (draft)

This is a draft from 2026-10-22. Scope is v0.1, which uses synthetic data only. This draft exists so that the foundation is built with the threats in view. It will be revised when the agent, the Telegram channel and real data handling arrive.

## Assets

Health records and their version history are the most sensitive asset, because a leak exposes symptoms, medication and clinical notes. Conversation transcripts are nearly as sensitive, because they contain the raw wording a person used and they are kept as the source of every record. Audio is sensitive while it exists and is discarded after transcription. Pending proposals matter because a wrong confirmation writes a wrong record. Credentials include the Telegram bot token, the model provider keys, the Postgres password and the Supabase secret key.

## Actors and trust boundaries

The legitimate user talks to the agent through Telegram and, later, the mobile app. The model provider receives transcripts and prompts. Anyone who can read the repository, its CI logs or its container volumes sits inside the blast radius of a secret leak. Stored content goes into the model prompt. Examples are a saved note or a transcript from an earlier session. It is untrusted input, although the user wrote it.

The main trust boundary is between the agent and `core`. The agent proposes and `core` decides. A second boundary is between each channel and `api`. Telegram messages and HTTP payloads come from outside, and `api` parses them once at the edge.

## Threats and mitigations

| Threat | Mitigation in the current design | Status |
|---|---|---|
| Real health data reaches a development database or a test | Demo data lives only in the local Supabase stack and personal data in a separate hosted project. Tests and seeds refuse any non-loopback host. v0.1 uses synthetic data only. | In place for db tests and seeds, planned for evals |
| App data read through the auto-generated REST API with the publishable key that ships in clients | `public` is not exposed by PostgREST, and every app table has row level security with no policies | In place, verified with a REST call returning no table |
| Supabase secret key leaks to a client or channel | The key bypasses row level security, so it lives only in `apps/api` and local tooling. `.env` and `.env.local` are gitignored | Convention, enforced in review |
| Deleting an identity silently removes a profile and its history | `public.users` references `auth.users` with `ON DELETE RESTRICT` | In place |
| Secrets committed to the repository | `.env` and `.env.local` are gitignored, and `.env.example` holds placeholders only | In place |
| Content leaks through logs | Logs record ids, kinds, durations and error names, never record content, transcripts or prompts | Convention, enforced in review |
| Prompt injection through stored content | Stored content reaches the model only inside clearly delimited tool results, and instructions inside it are never followed | Planned in agent package |
| Agent writes records without consent | The agent can only create pending proposals, and only `core` confirms them | Planned in core and agent |
| Silent history loss | Records are corrected with new versions and never overwritten or deleted | Planned in domain |
| Wrong values from vague input | Vague magnitudes are asked about and never converted to numbers | Planned in agent policy |
| Dependency or lint bypass lets a layer leak | Boundaries rules run in the same turbo pipeline as typecheck and tests | In place locally, CI workflow written but not yet run on GitHub |
| Runaway model usage or hung turns | Every turn has a step, token and time limit | Planned in agent package |
| Audio or transcripts persist after use | Audio is discarded after transcription and the transcript is the kept source | Planned in providers |

## Open questions

It is not known if model providers keep transcripts. A decision is necessary on whether a zero-retention option is mandatory before real data is used. How a household member's data is separated if more than one person uses the same bot. Whether the Telegram account itself needs a second factor for destructive actions, which in this design means only corrections and never deletions.
