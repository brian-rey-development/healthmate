# @healthmate/telegram

`telegram` is a thin channel adapter built with grammY. It turns Telegram updates into calls to `api` through the client in `contracts`, and it turns the answers into messages. It imports only `contracts`. It holds no domain rule and no database access.

## Layout

```
src/
  main.ts        reads the environment, builds the bot, starts it
  bot.ts         createBot(deps), registers the handlers
  handlers/      text.ts, voice.ts, callbacks.ts
  views/         renders a contracts view to Telegram text and keyboards
  copy.ts        every fixed text, including the text for each error code
```

## Handlers

- A handler calls 1 function of the API client and renders the result. It has no `if` about the domain.
- A voice handler downloads the file, sends it to `api`, and deletes the local file in a `finally` block. Audio is never stored.
- The bot maps each telegram user to a HealthMate user through `api`. It never trusts a user id from message text.
- The bot handles 1 update at a time for each chat, with `sequentialize` from `@grammyjs/runner`, so 2 taps cannot race.

## Buttons

- Callback data is `<action>:<toolUseId>`, for example `confirm:toolu_01A`. Telegram allows 64 bytes, so the data never holds the draft.
- A callback handler always calls `answerCallbackQuery`, also after an error, so the button stops its spinner.
- After a confirm, edit, or discard, the bot removes the keyboard from the proposal message, so a second tap is not possible.
- `already_recorded` and `proposal_expired` are normal results. The bot shows their text from `copy.ts` and does not log them as errors.

## Text

- Every fixed text lives in `copy.ts`, including red-flag copy that comes from `api`. A handler never writes a text inline.
- Use `parse_mode: 'HTML'` and escape all text from the person or from the model with 1 `escapeHtml` function.

## Runtime

- Local development uses long polling. Production uses a webhook with a secret token that the bot checks on each request.
- The bot token comes from the environment in `main.ts` only. It never appears in a log.
- A log line holds the update id, the handler name, the duration and the error code. It never holds message text or a transcript.

## Tests

- Tests build the bot with a fake API client and feed it update objects. They check the API call and the reply. No test calls Telegram.
- Test each error code from `contracts` to its text, and the `finally` that deletes the audio after a failure.
