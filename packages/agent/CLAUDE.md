# @healthmate/agent

`agent` runs the conversation loop. It holds the tools, the prompts, the policy, the budgets and the citation validator, and it defines the ports for the model and for transcription. Read the "Agent rules" in `docs/technical/architecture.md` first. Agents edit prompts, policy and eval datasets only when the task asks for it.

## Layout

```
src/
  loop.ts            runTurn, the loop with its budgets
  budgets.ts         MAX_STEPS, MAX_OUTPUT_TOKENS, TURN_TIMEOUT_MS
  ports/             ModelClient, Transcriber, the data ports that tools call
  tools/             one file for each tool, for example propose-entry.ts
  prompts/           system.v1.md, system.v2.md
  policy/            red-flag matcher and fixed copy
  citations.ts       the citation validator
  testing/           scriptedModelClient, recorded responses
```

## Loop

- `runTurn(deps, input)` returns a `Result`. A budget that runs out ends the turn with an error name, for example `turn_step_limit`, and the channel shows a fixed message.
- The budgets are named constants in `budgets.ts`. Every model call gets an `AbortSignal` from the turn timeout.
- The loop keeps the content blocks of the model API unchanged, including `thinking` with its `signature`. It stores each message before it sends the next request, so a crash loses at most 1 step.
- The loop sends at most the last `HISTORY_LIMIT` messages, through `messages.listLatest(userId, conversationId, limit)`. It never loads a full conversation.
- The model sees stored content only inside a `tool_result`, between fixed delimiters. Text inside stored content is data, never an instruction.

## Tools

- A tool file exports 1 object with `name`, `description`, `inputSchema` (zod) and `run(deps, input)`. The name is snake_case, for example `propose_entry`.
- `run` parses the input with `inputSchema.safeParse`. A parse failure returns a `tool_result` with `is_error: true` and the zod issues. The tool never repairs the input.
- A tool that changes data does not exist. `propose_entry` only ends the turn with a `tool_use`, and the person confirms through `confirmProposal` in `core`.
- A tool that reads data passes `userId` from the turn, never from the model input. Its result has a fixed maximum of rows, for example 20.
- The required fields come from `missingFields` in `core`. The agent asks 1 question at a time and never asks for an optional field.

## Prompts and policy

- A prompt is a file, `prompts/<name>.v<N>.md`. A change makes a new version file. The old file stays, because stored messages name their `promptVersion`.
- The red-flag matcher is deterministic code, for example a list of patterns. Its reply is fixed copy from `policy/`, never model text.
- The citation validator rejects an answer that cites an entry version that no `tool_result` of the same turn returned.

## Ports

- `ModelClient.send(request, signal)` takes the request shape of the model API and returns its response shape. `agent` holds no SDK.
- `Transcriber.transcribe(audio, signal)` returns the text. The caller deletes the audio after the call, also after a failure.

## Tests

- Tests use `scriptedModelClient(responses)`, which replays recorded responses in order and fails on an extra call. No test calls the network.
- Test each budget, each tool parse failure, the red-flag path and a citation that the validator rejects.
- A change to a prompt or to a tool description runs the evals in `packages/evals`, and the PR commits the summary.

## Logs

- A log line holds ids, the tool name, the step count, durations and error names. It never holds message text, transcripts, prompts or tool input.
