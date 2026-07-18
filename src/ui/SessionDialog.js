const POSITION_ROWS = [
  ['Left', 'left_accuracy_percent'],
  ['Middle', 'middle_accuracy_percent'],
  ['Right', 'right_accuracy_percent']
];

const SERVE_ROWS = [
  ['Standing Float', 'standing_float_accuracy_percent'],
  ['Jump Float', 'jump_float_accuracy_percent'],
  ['Jump Topspin', 'jump_topspin_accuracy_percent'],
  ['Short Float', 'short_float_accuracy_percent'],
  ['Deep Topspin', 'deep_topspin_accuracy_percent']
];

function percent(value) {
  return value === '' ? '—' : `${value}%`;
}

export class SessionDialog {
  constructor(doc = document) {
    this.doc = doc;
    this.e = {
      overlay: doc.querySelector('#session-overlay'),
      username: doc.querySelector('#session-username'),
      error: doc.querySelector('#session-error'),
      total: doc.querySelector('#summary-total'),
      correct: doc.querySelector('#summary-correct'),
      incorrect: doc.querySelector('#summary-incorrect'),
      accuracy: doc.querySelector('#summary-accuracy'),
      reaction: doc.querySelector('#summary-reaction'),
      score: doc.querySelector('#summary-score'),
      averageScore: doc.querySelector('#summary-average-score'),
      positions: doc.querySelector('#summary-positions'),
      serves: doc.querySelector('#summary-serves'),
      mistakes: doc.querySelector('#summary-mistakes'),
      downloadAttempts: doc.querySelector('#download-attempts'),
      downloadSession: doc.querySelector('#download-session'),
      downloadBoth: doc.querySelector('#download-both'),
      startNew: doc.querySelector('#start-new-session'),
      returnToSession: doc.querySelector('#return-to-session')
    };
    this.summary = null;
    this.callbacks = {};
    this.bindValidated('downloadAttempts');
    this.bindValidated('downloadSession');
    this.bindValidated('downloadBoth');
    this.e.startNew.addEventListener('click', () => this.callbacks.startNew?.());
    this.e.returnToSession.addEventListener('click', () => this.callbacks.returnToSession?.());
  }

  bindValidated(name) {
    this.e[name].addEventListener('click', () => {
      const username = this.getUsername();
      if (!username) {
        this.e.error.textContent = 'Username is required before downloading.';
        return;
      }
      this.e.error.textContent = '';
      this.callbacks[name]?.(username);
    });
  }

  onDownloadAttempts(callback) { this.callbacks.downloadAttempts = callback; }
  onDownloadSession(callback) { this.callbacks.downloadSession = callback; }
  onDownloadBoth(callback) { this.callbacks.downloadBoth = callback; }
  onStartNewSession(callback) { this.callbacks.startNew = callback; }
  onReturnToSession(callback) { this.callbacks.returnToSession = callback; }

  getUsername() {
    return this.e.username.value.trim();
  }

  open({ summary, username = '' }) {
    this.summary = summary;
    this.e.username.value = username;
    this.e.error.textContent = '';
    this.e.total.textContent = summary.total_attempts;
    this.e.correct.textContent = summary.correct_attempts;
    this.e.incorrect.textContent = summary.incorrect_attempts;
    this.e.accuracy.textContent = percent(summary.accuracy_percent);
    this.e.reaction.textContent = summary.average_reaction_ms === '' ? '—' : `${summary.average_reaction_ms} ms`;
    this.e.score.textContent = summary.total_score;
    this.e.averageScore.textContent = summary.average_score === '' ? '—' : summary.average_score;
    this.renderRows(this.e.positions, POSITION_ROWS, summary);
    this.renderRows(this.e.serves, SERVE_ROWS, summary);
    this.e.mistakes.textContent = '';
    this.addRow(this.e.mistakes, 'MINE when LEAVE expected', summary.mine_when_leave_expected);
    this.addRow(this.e.mistakes, 'LEAVE when MINE expected', summary.leave_when_mine_expected);
    this.addRow(this.e.mistakes, 'Missed calls', summary.missed_call_count);
    const disabled = summary.total_attempts === 0;
    this.e.downloadAttempts.disabled = disabled;
    this.e.downloadSession.disabled = disabled;
    this.e.downloadBoth.disabled = disabled;
    this.e.overlay.hidden = false;
    this.e.username.focus?.();
  }

  renderRows(container, rows, summary) {
    container.textContent = '';
    for (const [label, key] of rows) this.addRow(container, label, percent(summary[key]));
  }

  addRow(container, label, value) {
    const row = this.doc.createElement('div');
    const name = this.doc.createElement('span');
    const metric = this.doc.createElement('strong');
    name.textContent = label;
    metric.textContent = value;
    row.append(name, metric);
    container.append(row);
  }

  close() {
    this.e.overlay.hidden = true;
    this.e.error.textContent = '';
  }
}
