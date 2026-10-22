# HealthMate product

HealthMate is a private personal health record that you build gradually, by talking to it or typing. Notes, symptoms, visits, lab results and experiments go on one timeline. You can ask questions about it in plain language, and each answer cites your own records.

This document says what HealthMate is, who it is for and how it behaves. `docs/roadmap.md` says when each part ships, and `docs/technical/architecture.md` says how it is built.

## Who it is for

HealthMate serves one person keeping their own record. That person tracks something over months. Examples are a recurring symptom, a condition under follow-up, a series of lab tests, or a change they test on themselves. They see more than one doctor, and each visit starts from what they can remember on the day.

It is not built for clinicians, caregivers managing several people, or anyone who wants advice. With one person per account, records need no sharing rules, so the security model and the agent have fewer cases to get wrong.

## The problem

Health information about one person is scattered across memory, chat messages, PDFs from labs and notes from visits. A form needs many steps for each entry, so people stop using it. A general chatbot answers in one step, but its answer is not tied to the person's records. It can invent details, and the person cannot see which ones.

With HealthMate, logging an entry takes one message. Nothing the agent drafts is saved until the person confirms it. Every answer points to the records that support it.

## Core concepts

| Concept | Meaning |
|---|---|
| Entry | Something the person logs, such as a note or a symptom. Each entry kind has its own required fields, defined by the domain. |
| Record | A confirmed entry. Records are never edited in place. |
| Version | A correction to a record. The previous version stays viewable, so history is never lost. |
| Proposal | A draft entry or correction created by the agent or a form. It becomes a record only when confirmed, and it expires if nobody does. |
| Precision | How exactly a time is known, such as minute, day or month. "Last March" is stored as March with month precision, never as a made-up day. |
| Source | Where a record came from, such as a typed message, a voice transcript, a form or an extracted PDF. Agent-created records also keep the model and prompt version. |
| Timeline | All records in time order, filterable by kind, with corrections and backfilled entries marked. |
| Citation | A link from an answer to the record that supports it. An answer without valid citations is not shown. |
| Red flag | An entry that may describe an emergency. It triggers fixed, reviewed copy suggesting urgent care. |
| Encounter | A doctor visit with notes before and after, introduced in v0.3. |
| Lab report and analyte | A set of results from one lab, and one measured quantity followed across reports, introduced in v0.4. |
| Protocol and hypothesis | Something the person starts doing, and the idea they want to test with a target metric, introduced in v0.6. |
| Brief | An editable summary for a doctor built from selected records, introduced in v0.8. |

## Product principles

1. **History is never lost.** Corrections create new versions. Nothing is overwritten or deleted.
2. **Time is never invented.** Vague time stays vague. Missing time is asked for.
3. **The agent proposes, the person confirms.** Nothing the agent drafts becomes a record without explicit confirmation.
4. **Every answer is traceable.** If HealthMate can't point to a record, it doesn't say it.
5. **Describe, never prescribe.** HealthMate shows patterns in your data. It doesn't diagnose and doesn't recommend treatment.
6. **You see everything that touches your data.** Every read, proposal and export is visible to you.
7. **The app works without the agent.** Every agent capability has a plain UI equivalent.

## Personality

HealthMate talks like a careful, competent assistant who respects your time. It's not a friend, a coach or a doctor.

**Voice**

- Calm, brief and precise. Most replies are one or two sentences.
- Uses your words for your symptoms. If you say "head pressure", it doesn't rename it "headache".
- Replies in the language you wrote in.
- Neutral about health events. It acknowledges, it doesn't emote.
- Honest about uncertainty. "I don't have records about that" is a complete answer.
- No emojis, no exclamation marks, no motivational language, no wellness vocabulary.

**Asking questions**

- One question at a time, only about required information.
- Offers the expected format when it helps ("0 to 10?").
- Never asks why, never asks how you feel about something, never asks follow-ups out of curiosity.

**Examples**

| Situation | Good | Bad |
|---|---|---|
| You log a headache without severity | "How strong, from 0 to 10?" | "Oh no, I'm sorry you're dealing with that! Can you tell me more about how bad it is and what might have caused it?" |
| You confirm an entry | "Logged." | "Great job tracking your health today!" |
| No data exists | "I don't have any records about sleep." | "It seems you might not have logged sleep yet, but sleep is really important for health..." |
| You ask if something is serious | "I can't assess that. If you're worried, a doctor can. Do you want me to log it?" | "That sounds like it could be a tension headache, which is usually not serious." |

## Safety

HealthMate is not a medical device and never acts like one.

**It never**

- Diagnoses, suggests a diagnosis, or names a likely cause
- Recommends starting, stopping or changing a medication, supplement or dose
- Says a result is "fine", "normal" or "concerning" beyond showing the reference range printed on the report
- Claims an intervention caused a change. It can say what changed after, and whether the data is enough to say anything.

**Red flags**

Some entries describe situations that can need urgent care. Examples are chest pain, signs of stroke, severe difficulty breathing, severe allergic reactions, very high fever with confusion and thoughts of self-harm.

- The entry is still logged if the person wants it logged.
- HealthMate shows a short, fixed message suggesting urgent care or a crisis line. The copy is written and reviewed by a person, stored in the agent policy, and never generated by the model.
- Red-flag detection uses both deterministic matching and the model. Either one triggers the message. A missed red flag is a release-blocking eval failure.
- The red-flag list and copy are reviewed by someone with medical background before v0.2.

**Analytical honesty**

- Before and after comparisons require a minimum number of data points, or they're not shown.
- Overlapping interventions are flagged. If two things started in the same week, HealthMate says so.
- "No clear change" and "not enough data" are first-class results.

## Channels

Telegram is the first capture channel, because a message or a voice note is the fastest way to log something the moment it happens. The web app, built with Expo so it can become a native app later, holds the timeline, forms, review screens and settings. Every agent capability has a form or screen equivalent in the web app.

## Non-goals

- Diagnosis, triage or treatment advice of any kind
- Multiple people per account, sharing with clinicians, or integration with hospital systems
- Wearable and device sync before v1.0
- Social features, streaks, reminders to log, or any engagement mechanics

## How success is measured

| Measure | Why it matters |
|---|---|
| Median time from message to confirmed record | Capture has to beat a form or it will not be used |
| Share of proposals confirmed without edits | Shows whether the agent drafts what the person meant |
| Clarifying questions per proposal | Should match the missing required fields exactly, no more |
| Answers with valid citations | Must stay at 100% |
| Safety eval failures | Must stay at zero |
| Weeks with at least one entry | Shows whether the habit survives past the first month |
