export const ATTEMPT_COLUMNS = Object.freeze([
  'session_id',
  'attempt_number',
  'timestamp',
  'username',
  'controlled_position',
  'serve_type',
  'expected_call',
  'actual_call',
  'correct',
  'reaction_ms',
  'decision_points',
  'movement_points',
  'reaction_points',
  'penalty',
  'total_score',
  'owner_position',
  'landing_x',
  'landing_z'
]);

export const SUMMARY_COLUMNS = Object.freeze([
  'session_id',
  'username',
  'started_at',
  'ended_at',
  'total_attempts',
  'correct_attempts',
  'incorrect_attempts',
  'accuracy_percent',
  'average_reaction_ms',
  'total_score',
  'average_score',
  'left_accuracy_percent',
  'middle_accuracy_percent',
  'right_accuracy_percent',
  'standing_float_accuracy_percent',
  'jump_float_accuracy_percent',
  'jump_topspin_accuracy_percent',
  'short_float_accuracy_percent',
  'deep_topspin_accuracy_percent',
  'mine_when_leave_expected',
  'leave_when_mine_expected',
  'missed_call_count'
]);

export function escapeCsvCell(value) {
  const text = value == null ? '' : String(value);
  if (/[",\r\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

export function rowsToCsv(columns, rows) {
  const lines = [columns.join(',')];
  for (const row of rows) {
    lines.push(columns.map((column) => escapeCsvCell(row[column] ?? '')).join(','));
  }
  return `\uFEFF${lines.join('\r\n')}\r\n`;
}

export function attemptsToCsv(attempts, username) {
  const normalizedUsername = username.trim();
  return rowsToCsv(
    ATTEMPT_COLUMNS,
    attempts.map((attempt) => ({ ...attempt, username: normalizedUsername }))
  );
}

export function summaryToCsv(summary) {
  return rowsToCsv(SUMMARY_COLUMNS, [summary]);
}

export function sanitizeFilenamePart(value) {
  return value.trim().replace(/[\\/:*?"<>|]/g, '_');
}

function safeTimestamp(value) {
  return value.toISOString().replace(/\.\d{3}Z$/, 'Z').replaceAll(':', '-');
}

export function buildExportFilenames(username, endedAt) {
  const safeUsername = sanitizeFilenamePart(username);
  const timestamp = safeTimestamp(endedAt);
  return {
    attempts: `attempts_${safeUsername}_${timestamp}.csv`,
    session: `session_${safeUsername}_${timestamp}.csv`
  };
}

export function downloadCsv(filename, csvText, doc = document, urlApi = URL) {
  const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8' });
  const url = urlApi.createObjectURL(blob);
  const anchor = doc.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.hidden = true;
  doc.body.append(anchor);
  anchor.click();
  anchor.remove();
  urlApi.revokeObjectURL(url);
}
