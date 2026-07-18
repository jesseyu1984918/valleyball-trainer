# Session Summary and CSV Download Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add browser-only session tracking, an End Session summary dialog, and separate attempt/session CSV downloads with a required username.

**Architecture:** Keep gameplay in `Game`, move session state and aggregation into `SessionTracker`, isolate CSV formatting/download logic in `CsvExport`, and isolate modal rendering/validation in `SessionDialog`. Attempts remain in memory until the player downloads or starts a new session; no backend or Docker-host write path is introduced.

**Tech Stack:** Vite, vanilla JavaScript, Three.js, Vitest, browser Blob/Object URL downloads, existing static Docker/nginx deployment.

## Global Constraints

- Browser-only implementation; do not add a backend service.
- Closing or refreshing the page discards the in-memory session.
- Username is required before any CSV export.
- Generate two separate files: `attempts_<username>_<timestamp>.csv` and `session_<username>_<timestamp>.csv`.
- CSV output must include a UTF-8 BOM, RFC 4180-style escaping, stable column order, ISO 8601 UTC timestamps, and `true`/`false` booleans.
- Attempt recording occurs exactly once per evaluated round, including missed calls.
- Opening the summary pauses gameplay; returning resumes without losing records.
- Starting a new session resets session records, score, streak, and round state.

---

### Task 1: Session tracking and aggregation

**Files:**
- Create: `src/session/SessionTracker.js`
- Create: `src/session/SessionTracker.test.js`

**Interfaces:**
- Produces: `new SessionTracker({ now = () => new Date(), idFactory = defaultIdFactory })`
- Produces: `recordAttempt(attempt): object`
- Produces: `getAttempts(): object[]`
- Produces: `getSummary({ username, endedAt = new Date() }): object`
- Produces: `reset(): void`

- [ ] **Step 1: Write failing tests**

Test that a new tracker starts empty with a session ID and start timestamp; records attempts immutably; computes totals, position accuracy, serve-type accuracy, reaction averages, score averages, and mistake counts; leaves unused accuracy categories blank; and reset creates a fresh session.

Use deterministic fixtures such as:

```js
const attempts = [
  {
    timestamp: '2026-07-18T05:00:00.000Z',
    controlled_position: 'left',
    serve_type: 'standingFloat',
    expected_call: 'mine',
    actual_call: 'mine',
    correct: true,
    reaction_ms: 1000,
    decision_points: 60,
    movement_points: 20,
    reaction_points: 10,
    penalty: 0,
    total_score: 90,
    owner_position: 'left',
    landing_x: -2.5,
    landing_z: 7.1
  },
  {
    timestamp: '2026-07-18T05:00:05.000Z',
    controlled_position: 'right',
    serve_type: 'jumpTopspin',
    expected_call: 'leave',
    actual_call: 'mine',
    correct: false,
    reaction_ms: 1400,
    decision_points: 0,
    movement_points: 10,
    reaction_points: 8,
    penalty: 0,
    total_score: 18,
    owner_position: 'middle',
    landing_x: 0.2,
    landing_z: 7.8
  }
];
```

- [ ] **Step 2: Run the focused test and confirm failure**

Run:

```bash
npm test -- --run src/session/SessionTracker.test.js
```

Expected: FAIL because `SessionTracker.js` does not exist.

- [ ] **Step 3: Implement `SessionTracker`**

Use fixed category maps:

```js
const POSITION_KEYS = ['left', 'middle', 'right'];
const SERVE_KEYS = ['standingFloat', 'jumpFloat', 'jumpTopspin', 'shortFloat', 'deepTopspin'];
```

Normalize each recorded attempt by adding:

```js
{
  session_id: this.sessionId,
  attempt_number: this.attempts.length + 1,
  ...attempt
}
```

Compute category accuracy as a percentage rounded to one decimal, returning `''` when no attempts exist. Count:

```js
mine_when_leave_expected
leave_when_mine_expected
missed_call_count
```

where a missed call is `actual_call == null`.

- [ ] **Step 4: Run the focused test and confirm pass**

```bash
npm test -- --run src/session/SessionTracker.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/session/SessionTracker.js src/session/SessionTracker.test.js
git commit -m "feat: add session tracking and aggregation"
```

---

### Task 2: CSV serialization and browser downloads

**Files:**
- Create: `src/session/CsvExport.js`
- Create: `src/session/CsvExport.test.js`

**Interfaces:**
- Consumes: attempt objects and summary object from `SessionTracker`
- Produces: `attemptsToCsv(attempts, username): string`
- Produces: `summaryToCsv(summary): string`
- Produces: `sanitizeFilenamePart(value): string`
- Produces: `buildExportFilenames(username, endedAt): { attempts, session }`
- Produces: `downloadCsv(filename, csvText, doc = document, urlApi = URL): void`

- [ ] **Step 1: Write failing tests**

Cover:

```js
escapeCsvCell('a,b') === '"a,b"'
escapeCsvCell('a"b') === '"a""b"'
escapeCsvCell('a\nb') === '"a\nb"'
sanitizeFilenamePart(' Alex/Smith:* ') === 'Alex_Smith__'
```

Assert exact fixed header order for attempts:

```text
session_id,attempt_number,timestamp,username,controlled_position,serve_type,expected_call,actual_call,correct,reaction_ms,decision_points,movement_points,reaction_points,penalty,total_score,owner_position,landing_x,landing_z
```

Assert exact fixed header order for session summary matching the design specification. Assert output begins with `\uFEFF`.

- [ ] **Step 2: Run and confirm failure**

```bash
npm test -- --run src/session/CsvExport.test.js
```

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement CSV functions**

Use a single serializer:

```js
export function rowsToCsv(columns, rows) {
  const lines = [columns.join(',')];
  for (const row of rows) {
    lines.push(columns.map((column) => escapeCsvCell(row[column] ?? '')).join(','));
  }
  return `\uFEFF${lines.join('\r\n')}\r\n`;
}
```

`downloadCsv()` must create a Blob with `text/csv;charset=utf-8`, create an object URL, click a temporary anchor, remove it, and revoke the URL.

- [ ] **Step 4: Run and confirm pass**

```bash
npm test -- --run src/session/CsvExport.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/session/CsvExport.js src/session/CsvExport.test.js
git commit -m "feat: add CSV export utilities"
```

---

### Task 3: Session summary dialog

**Files:**
- Modify: `index.html`
- Modify: `src/styles.css`
- Create: `src/ui/SessionDialog.js`
- Create: `src/ui/SessionDialog.test.js`

**Interfaces:**
- Consumes: summary object from `SessionTracker`
- Produces: `new SessionDialog(doc = document)`
- Produces: `open({ summary, username = '' }): void`
- Produces: `close(): void`
- Produces callbacks: `onDownloadAttempts`, `onDownloadSession`, `onDownloadBoth`, `onStartNewSession`, `onReturnToSession`
- Produces: `getUsername(): string`

- [ ] **Step 1: Add failing DOM tests**

Create a minimal fake document fixture containing the dialog markup. Test:

- opening removes `hidden`
- summary fields render correctly
- export buttons are disabled when total attempts is zero
- blank username shows an inline validation error and suppresses the callback
- trimmed username is passed to callbacks
- Return to Session and Start New Session callbacks fire once

- [ ] **Step 2: Run and confirm failure**

```bash
npm test -- --run src/ui/SessionDialog.test.js
```

Expected: FAIL because the controller and markup do not exist.

- [ ] **Step 3: Add modal markup**

Add an overlay with `role="dialog"`, `aria-modal="true"`, a required username input, metric fields, position and serve breakdown containers, mistake fields, inline error region, and these buttons:

```text
Download Attempts CSV
Download Session CSV
Download Both
Start New Session
Return to Session
```

- [ ] **Step 4: Implement `SessionDialog`**

Keep rendering logic data-driven. Validation must trim the username and reject empty strings. Download callbacks receive the validated username. Do not reset or mutate session state inside this class.

- [ ] **Step 5: Add responsive styling**

Style the overlay, dialog, metrics, breakdown rows, error state, and button groups. Ensure the dialog fits narrow mobile screens without horizontal overflow.

- [ ] **Step 6: Run and confirm pass**

```bash
npm test -- --run src/ui/SessionDialog.test.js
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add index.html src/styles.css src/ui/SessionDialog.js src/ui/SessionDialog.test.js
git commit -m "feat: add session summary dialog"
```

---

### Task 4: HUD End Session control

**Files:**
- Modify: `index.html`
- Modify: `src/ui/Hud.js`
- Modify: `src/ui/Hud.test.js` or create it if absent

**Interfaces:**
- Produces: `Hud.onEndSession(callback): void`

- [ ] **Step 1: Write a failing HUD test**

Verify that clicking `#end-session` invokes the registered callback once.

- [ ] **Step 2: Run and confirm failure**

```bash
npm test -- --run src/ui/Hud.test.js
```

Expected: FAIL because the callback is not implemented.

- [ ] **Step 3: Add button and callback binding**

Add:

```html
<button id="end-session" type="button">End Session</button>
```

Store the element in `Hud` and bind it through `onEndSession(callback)`.

- [ ] **Step 4: Run and confirm pass**

```bash
npm test -- --run src/ui/Hud.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add index.html src/ui/Hud.js src/ui/Hud.test.js
git commit -m "feat: add End Session HUD control"
```

---

### Task 5: Game integration and exact-once attempt recording

**Files:**
- Modify: `src/game/Game.js`
- Create: `src/game/GameSessionIntegration.test.js`

**Interfaces:**
- Consumes: `SessionTracker`, `SessionDialog`, CSV export functions, `Hud.onEndSession`
- Produces: one normalized attempt per completed `evaluate()` call
- Produces: pause/resume and new-session behavior

- [ ] **Step 1: Write integration tests around extracted pure helpers**

To avoid constructing WebGL in tests, extract and export these helpers from `Game.js` or a focused `src/session/GameSessionBridge.js`:

```js
buildAttemptRecord({ scenario, controlledSlot, decision, call, result, reactionMs, timestamp })
```

and test that it maps all required attempt fields correctly, including `actual_call: ''` or `null` for a missed call.

Also test an `attemptRecorded` guard pattern so repeated evaluation paths cannot append twice.

- [ ] **Step 2: Run and confirm failure**

```bash
npm test -- --run src/game/GameSessionIntegration.test.js
```

Expected: FAIL because the integration helper does not exist.

- [ ] **Step 3: Integrate session state**

In the constructor:

```js
this.sessionTracker = new SessionTracker();
this.sessionDialog = new SessionDialog();
this.sessionPaused = false;
this.attemptRecorded = false;
```

Wire End Session to:

```js
this.sessionPaused = true;
const summary = this.sessionTracker.getSummary({ username: '' });
this.sessionDialog.open({ summary });
```

At the start of each round reset `attemptRecorded = false`.

After scoring is finalized in `evaluate()`, build and record the attempt once, then set `attemptRecorded = true`.

- [ ] **Step 4: Wire dialog actions**

For each download action:

1. call `getSummary({ username })`
2. clone attempts with the same username added to every row
3. generate the appropriate CSV
4. call `downloadCsv()` with filenames from one shared `endedAt` timestamp

`Download Both` must trigger two separate downloads using the same username and timestamp.

`Return to Session` closes the dialog and clears `sessionPaused` without changing attempts, score, streak, phase, or scenario.

`Start New Session` must:

```js
this.sessionTracker.reset();
this.score = 0;
this.streak = 0;
this.scenario = null;
this.decisionDone = false;
this.sessionPaused = false;
this.hud.update({ score: 0, streak: 0, reaction: '—', state: 'Countdown' });
this.sessionDialog.close();
```

- [ ] **Step 5: Pause the animation state safely**

In `loop(now)`, continue rendering while paused but skip phase timers, player movement, ball progress, evaluation, and round reset logic. Update `this.last = now` while paused so resuming does not create a large `dt` jump.

- [ ] **Step 6: Run integration test and full suite**

```bash
npm test -- --run src/game/GameSessionIntegration.test.js
npm test -- --run
```

Expected: all tests PASS.

- [ ] **Step 7: Commit**

```bash
git add src/game/Game.js src/game/GameSessionIntegration.test.js
git commit -m "feat: integrate session tracking with gameplay"
```

---

### Task 6: Manual and Docker verification

**Files:**
- Modify only if verification reveals a defect.

- [ ] **Step 1: Run production build**

```bash
npm run build
```

Expected: Vite completes without errors and emits `dist/`.

- [ ] **Step 2: Build Docker image**

```bash
docker compose -f compose.yaml build --no-cache
```

Expected: image builds successfully with the unchanged static nginx architecture.

- [ ] **Step 3: Run manual acceptance flow**

Verify:

1. Play rounds at multiple controlled positions and serve types.
2. Press End Session and confirm the game pauses.
3. Confirm metrics match completed attempts.
4. Confirm blank username blocks downloads.
5. Confirm each individual download works.
6. Confirm Download Both produces two separate files.
7. Open both CSVs in a spreadsheet and verify columns and UTF-8 rendering.
8. Return to Session and confirm play resumes with prior data intact.
9. Start New Session and confirm score, streak, and summary reset.
10. Refresh and confirm prior in-memory data is discarded.

- [ ] **Step 4: Commit any verification fixes**

```bash
git add -A
git commit -m "fix: address session export verification findings"
```

Skip this commit when no files changed.
