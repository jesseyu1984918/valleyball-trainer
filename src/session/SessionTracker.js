const POSITION_KEYS = ['left', 'middle', 'right'];
const SERVE_KEYS = ['standingFloat', 'jumpFloat', 'jumpTopspin', 'shortFloat', 'deepTopspin'];

function defaultIdFactory() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `session-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function roundOne(value) {
  return Math.round(value * 10) / 10;
}

function categoryAccuracy(attempts, field, key) {
  const matching = attempts.filter((attempt) => attempt[field] === key);
  if (matching.length === 0) return '';
  const correct = matching.filter((attempt) => attempt.correct).length;
  return roundOne((correct / matching.length) * 100);
}

export class SessionTracker {
  constructor({ now = () => new Date(), idFactory = defaultIdFactory } = {}) {
    this.now = now;
    this.idFactory = idFactory;
    this.reset();
  }

  reset() {
    this.sessionId = this.idFactory();
    this.startedAt = this.now().toISOString();
    this.attempts = [];
  }

  recordAttempt(attempt) {
    const normalized = Object.freeze({
      session_id: this.sessionId,
      attempt_number: this.attempts.length + 1,
      ...attempt
    });
    this.attempts.push(normalized);
    return { ...normalized };
  }

  getAttempts() {
    return this.attempts.map((attempt) => ({ ...attempt }));
  }

  getSummary({ username, endedAt = new Date() }) {
    const totalAttempts = this.attempts.length;
    const correctAttempts = this.attempts.filter((attempt) => attempt.correct).length;
    const incorrectAttempts = totalAttempts - correctAttempts;
    const reactionTotal = this.attempts.reduce((sum, attempt) => sum + Number(attempt.reaction_ms || 0), 0);
    const scoreTotal = this.attempts.reduce((sum, attempt) => sum + Number(attempt.total_score || 0), 0);

    const summary = {
      session_id: this.sessionId,
      username: username?.trim() ?? '',
      started_at: this.startedAt,
      ended_at: endedAt.toISOString(),
      total_attempts: totalAttempts,
      correct_attempts: correctAttempts,
      incorrect_attempts: incorrectAttempts,
      accuracy_percent: totalAttempts ? roundOne((correctAttempts / totalAttempts) * 100) : '',
      average_reaction_ms: totalAttempts ? roundOne(reactionTotal / totalAttempts) : '',
      total_score: scoreTotal,
      average_score: totalAttempts ? roundOne(scoreTotal / totalAttempts) : '',
      mine_when_leave_expected: this.attempts.filter(
        (attempt) => attempt.expected_call === 'leave' && attempt.actual_call === 'mine'
      ).length,
      leave_when_mine_expected: this.attempts.filter(
        (attempt) => attempt.expected_call === 'mine' && attempt.actual_call === 'leave'
      ).length,
      missed_call_count: this.attempts.filter((attempt) => attempt.actual_call == null || attempt.actual_call === '').length
    };

    for (const position of POSITION_KEYS) {
      summary[`${position}_accuracy_percent`] = categoryAccuracy(
        this.attempts,
        'controlled_position',
        position
      );
    }

    const serveFieldNames = {
      standingFloat: 'standing_float_accuracy_percent',
      jumpFloat: 'jump_float_accuracy_percent',
      jumpTopspin: 'jump_topspin_accuracy_percent',
      shortFloat: 'short_float_accuracy_percent',
      deepTopspin: 'deep_topspin_accuracy_percent'
    };
    for (const serveType of SERVE_KEYS) {
      summary[serveFieldNames[serveType]] = categoryAccuracy(this.attempts, 'serve_type', serveType);
    }

    return summary;
  }
}
