# @healthmate/mobile

`mobile` is an Expo app that runs on the web for v0.1. It shows the timeline, the corrections and the backfill markers, and it has a form for each entry kind. It talks to `api` through the client in `contracts`, and it imports only `contracts`. It holds no domain rule.

## Layout

```
app/              Expo Router screens, one file for each route
src/
  api.ts          creates the contracts client with the session token
  components/     shared components, one file for each component
  features/       timeline/, entry-form/, corrections/
  copy.ts         every fixed text, including the text for each error code
```

## Data

- Server data goes through TanStack Query. A query key is an array that starts with the resource, for example `['timeline', from, to]`. A mutation invalidates the keys that it changes.
- The app keeps no copy of server data in local state. Local state holds only form input and UI state.
- A form shows the required fields that `api` returns for the kind. The app never decides on its own which field is required.
- A confirm or a correction sends `expectedVersion`. On `stale_version` the app reloads the entry and shows the newer version.

## Components

- A component is a function in its own file, with less than 150 lines. A component that needs more is split.
- A list with more than 50 rows uses `FlatList`, with a stable `keyExtractor` on the entry id.
- Use `React.memo` and `useCallback` only after a profile shows a slow render.

## Access

- Each control has an `accessibilityLabel` and a touch target of 44 by 44 points.
- Text has a contrast of 4.5 to 1. Text scales with the system font size.
- Severity is shown as a number and a word, never only as a color.

## Dates and times

- The app shows a date in the time zone of the entry. A date with month or year precision shows only the month or the year, never a made-up day.

## Tests

- Test each feature with React Native Testing Library and a fake API client. Query the screen by role and label, never by a test id when a label exists.
- Test each error code from `contracts` to its text.
