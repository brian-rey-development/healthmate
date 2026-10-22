# @healthmate/providers

`providers` implements the `agent` ports with real services, the model client and the transcriber. It is the only package that imports a provider SDK. It imports only types from `agent`.

## Layout

- One folder for each provider, for example `src/anthropic/` and `src/<transcription provider>/`. Each folder exports 1 factory, for example `createAnthropicModelClient(config)`.
- `src/index.ts` exports the factories and their config types. It never exports an SDK object.

## Implementations

- A factory takes its config as an argument, for example `{ apiKey, model, timeoutMs }`. It never reads `process.env`. `apps/api` reads the environment and passes the values.
- The model id is config. The default is the latest Claude model that the release decided on, and it is written in 1 place in `apps/api`.
- Each call takes the `AbortSignal` from the port and also has its own timeout.
- Retry only a 429, a 529 or a 5xx, with exponential backoff and jitter, at most `MAX_ATTEMPTS = 3`. Honor `retry-after`. Never retry a 4xx that is not 429.
- A provider error becomes 1 of a fixed set of error names, for example `model_unavailable` or `model_rate_limited`. The SDK error never leaves this package.
- A service that gets health data meets the zero data retention rule. The config enables it, and the PR names the setting that proves it.

## Logs

- A log line holds the provider, the model id, the duration, the token counts, the status and the error name. It never holds a request or a response body.

## Tests

- Unit tests run against recorded HTTP fixtures, with no network. Record a fixture with synthetic data only.
- A live test that calls the real service is `*.live.test.ts`. It runs only with `pnpm test:live` and never in `pnpm verify`.
- Test the retry rules, the timeout and the mapping of each provider error to an error name.
