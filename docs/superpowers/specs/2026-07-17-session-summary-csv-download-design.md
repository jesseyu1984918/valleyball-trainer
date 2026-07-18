# Session Summary and CSV Download — Design Specification

## 1. Purpose

Add lightweight session tracking to the volleyball trainer so a player can review their overall performance at the end of play and download two CSV files containing detailed attempts and an aggregate session summary.

This version is browser-only. It does not add a backend service and does not write files to the Docker host.

## 2. Session Lifecycle

- A new in-memory session starts automatically when the web app loads.
- Every completed serve attempt is appended to the current session in browser memory.
- The HUD includes an **End Session** button.
- Pressing **End Session** pauses gameplay and opens a session summary dialog.
- The player must enter a non-empty username before saving.
- After the username is accepted, the player can download two separate CSV files.
- After download, the player may start a new session without reloading the app.
- Closing or refreshing the page discards the unsaved in-memory session.

## 3. Attempt Data

Each attempt record contains:

- `session_id`
- `attempt_number`
- `timestamp`
- `username`
- `controlled_position`
- `serve_type`
- `expected_call`
- `actual_call`
- `correct`
- `reaction_ms`
- `decision_points`
- `movement_points`
- `reaction_points`
- `penalty`
- `total_score`
- `owner_position`
- `landing_x`
- `landing_z`

The username is added when the session is saved, not while attempts are being recorded.

## 4. Session Summary Data

The session summary contains:

- `session_id`
- `username`
- `started_at`
- `ended_at`
- `total_attempts`
- `correct_attempts`
- `incorrect_attempts`
- `accuracy_percent`
- `average_reaction_ms`
- `total_score`
- `average_score`
- `left_accuracy_percent`
- `middle_accuracy_percent`
- `right_accuracy_percent`
- `standing_float_accuracy_percent`
- `jump_float_accuracy_percent`
- `jump_topspin_accuracy_percent`
- `short_float_accuracy_percent`
- `deep_topspin_accuracy_percent`
- `mine_when_leave_expected`
- `leave_when_mine_expected`
- `missed_call_count`

Accuracy values with no attempts are exported as blank fields rather than `0`, so they are not mistaken for failed attempts.

## 5. Summary Dialog

The dialog displays:

- total attempts
- correct and incorrect counts
- overall accuracy
- average reaction time
- total and average score
- accuracy by controlled position
- accuracy by serve type
- mistake breakdown

Controls:

- required username input
- **Download Attempts CSV** button
- **Download Session CSV** button
- **Download Both** button
- **Start New Session** button
- **Return to Session** button before any download or reset

The game remains paused while the dialog is open.

## 6. CSV Files

Two separate files are generated in the browser:

- `attempts_<username>_<timestamp>.csv`
- `session_<username>_<timestamp>.csv`

Filename rules:

- trim username whitespace
- replace unsafe filename characters with `_`
- use a filesystem-safe UTC timestamp such as `2026-07-18T05-14-03Z`

CSV rules:

- UTF-8 with BOM for spreadsheet compatibility
- RFC 4180-style escaping
- fixed column order
- booleans exported as `true` or `false`
- timestamps exported in ISO 8601 UTC format
- one header row per file

## 7. Architecture

Create focused browser modules:

- `src/session/SessionTracker.js`
  - owns the current in-memory session
  - records attempts
  - computes the summary
  - resets for a new session

- `src/session/CsvExport.js`
  - converts attempts and summaries into escaped CSV text
  - creates filenames
  - triggers browser downloads

- `src/ui/SessionDialog.js`
  - manages the modal UI
  - validates username
  - renders the computed summary
  - exposes callbacks for download, resume, and reset

`Game` remains responsible for gameplay. After each evaluated round, it passes a normalized attempt record to `SessionTracker`.

## 8. Game Integration

`Game` adds:

- a `SessionTracker` instance
- paused state while the summary dialog is open
- an End Session callback from the HUD
- attempt recording after scoring is finalized

Attempt recording occurs exactly once per evaluated round, including missed calls.

Changing controlled position or serve settings does not end or reset the current session.

Starting a new session resets:

- session attempt records
- score
- streak
- round state

## 9. Error Handling

- Saving requires a non-empty username.
- A session with zero attempts can still be reviewed, but CSV download buttons remain disabled until at least one attempt exists.
- CSV export failures show an inline error without discarding session data.
- Repeated button clicks must not duplicate an attempt in memory.
- Starting a new session requires an explicit button press.
- Closing the dialog with **Return to Session** resumes the current round flow without deleting data.

## 10. Files to Modify

- `index.html`
  - add End Session control and modal markup
- `src/styles.css`
  - style the button, overlay, summary tables, and responsive dialog
- `src/ui/Hud.js`
  - expose End Session callback
- `src/game/Game.js`
  - record attempts, pause/resume, and reset sessions
- `src/game/Scoring.js`
  - preserve the detailed score components already returned
- `src/session/SessionTracker.js`
  - new session state and aggregation logic
- `src/session/CsvExport.js`
  - new CSV generation and download logic
- `src/ui/SessionDialog.js`
  - new dialog controller
- tests for session aggregation, CSV escaping, filenames, username validation, and game integration

## 11. Testing

### Unit tests

- new sessions start with zero attempts and a unique session ID
- each evaluated round is recorded once
- correct, incorrect, and missed calls aggregate correctly
- position accuracy is calculated independently
- serve-type accuracy is calculated independently
- no-attempt categories export blank accuracy fields
- average reaction time and scores are calculated correctly
- CSV cells containing commas, quotes, and newlines are escaped correctly
- filenames sanitize unsafe username characters
- attempts and summary CSVs use stable column order
- username is required before export
- reset creates a fresh session and clears prior attempts

### Manual acceptance tests

- End Session pauses the trainer
- summary metrics match played rounds
- username is required
- both CSV files download separately
- Download Both triggers both downloads
- opening a CSV in Excel or Numbers displays columns correctly
- Return to Session resumes without data loss
- Start New Session clears score, streak, and prior records
- position and serve-type changes are reflected in exported attempts
- Docker image still builds and serves the static app

## 12. Definition of Done

The feature is complete when a player can finish a session, enter a required username, review meaningful aggregate results, download separate attempt-level and session-level CSV files, resume the current session, or start a clean new session without introducing a backend or changing the existing Docker deployment architecture.