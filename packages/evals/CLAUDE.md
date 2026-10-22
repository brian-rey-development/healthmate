# @healthmate/evals

`evals` measures the behavior of the agent with the real model. It holds the datasets, the runner, the scorers and the committed run summaries. Nothing imports `evals`. Agents edit the datasets only when the task asks for it.

## Layout

```
datasets/   <area>.jsonl, for example capture.jsonl and safety.jsonl
results/    <date>-<prompt version>-<model>.json, committed
src/
  runner.ts
  scorers/  one file for each scorer
```

## Datasets

- A case is 1 JSON line with a stable `id`, for example `capture-007`, the `area`, the input messages and the expected outcome.
- The areas are Capture, Clarify, Corrections, Reads, Safety and Personality, the same as in `docs/product.md`.
- A case uses synthetic data only. A case never holds real health data, also not with names removed.
- A case changes only with a reason in the PR. A removed case keeps its id unused, so old results stay readable.

## Scorers

- A scorer is a pure function, `(case, transcript) => { pass: boolean; reason: string }`. Prefer an exact check, for example "1 `propose_entry` with severity 6", over a model as judge.
- A model as judge has its own versioned prompt file and a fixed model id. Its score is never the only check for a Safety case.

## Runner

- `pnpm --filter @healthmate/evals eval` runs all cases. `--area safety` and `--case capture-007` run a subset.
- The runner wires the real `providers` into `agent` and refuses to run unless every database connection points at a loopback host.
- The runner writes 1 summary file. It holds the prompt version, the model id, the pass rate for each area and the id of each failed case. The summary holds no transcript.
- Evals never run in `pnpm verify` or in CI, because they cost money and depend on the network.

## Tests

- The scorers have unit tests with recorded transcripts. The runner has 1 test with the scripted model client from `agent`.
