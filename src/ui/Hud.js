import { DIFFICULTIES, RECEIVER_POSITIONS, SERVE_TYPES } from '../config.js';

export class Hud {
  constructor(doc = document) {
    this.e = {
      score: doc.querySelector('#score'),
      streak: doc.querySelector('#streak'),
      reaction: doc.querySelector('#reaction'),
      state: doc.querySelector('#round-state'),
      feedback: doc.querySelector('#feedback'),
      controlledPosition: doc.querySelector('#controlled-position'),
      serveType: doc.querySelector('#serve-type'),
      revealServe: doc.querySelector('#reveal-serve'),
      difficulty: doc.querySelector('#difficulty'),
      guidanceMode: doc.querySelector('#guidance-mode'),
      activeServe: doc.querySelector('#active-serve'),
      decisionResult: doc.querySelector('#decision-result'),
      pauseMessage: doc.querySelector('#pause-message'),
      trainingPause: doc.querySelector('#training-pause'),
      endSession: doc.querySelector('#end-session')
    };
    this.positionButtons = [...doc.querySelectorAll('[data-position]')];
    this.resultTimer = null;
  }

  update({ score, streak, reaction, state, feedback }) {
    if (score !== undefined) this.e.score.textContent = score;
    if (streak !== undefined) this.e.streak.textContent = streak;
    if (reaction !== undefined) this.e.reaction.textContent = reaction;
    if (state !== undefined) this.e.state.textContent = state;
    if (feedback !== undefined) this.e.feedback.textContent = feedback;
  }

  onPositionSelect(callback) {
    for (const button of this.positionButtons) button.addEventListener('click', () => callback(button.dataset.position));
  }

  onEndSession(callback) { this.e.endSession?.addEventListener('click', callback); }
  onTrainingPause(callback) { this.e.trainingPause?.addEventListener('click', callback); }

  setTrainingPaused(paused) {
    if (this.e.trainingPause) this.e.trainingPause.textContent = paused ? 'Start Next Round' : 'Pause';
    if (this.e.pauseMessage) {
      this.e.pauseMessage.hidden = !paused;
      this.e.pauseMessage.textContent = paused ? 'PAUSED — adjust settings, then start next round' : '';
    }
  }

  setPosition(slot) {
    const metadata = RECEIVER_POSITIONS[slot];
    if (!metadata) return;
    this.e.controlledPosition.textContent = `Controlled: ${metadata.label}`;
    for (const button of this.positionButtons) {
      const active = button.dataset.position === slot;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    }
  }

  onServeTypeSelect(callback) { this.e.serveType?.addEventListener('change', () => callback(this.e.serveType.value)); }
  onRevealServeChange(callback) { this.e.revealServe?.addEventListener('change', () => callback(this.e.revealServe.value === 'show')); }
  onDifficultyChange(callback) { this.e.difficulty?.addEventListener('change', () => callback(this.e.difficulty.value)); }
  setDifficulty(key) { if (this.e.difficulty && DIFFICULTIES[key]) this.e.difficulty.value = key; }
  onGuidanceModeChange(callback) { this.e.guidanceMode?.addEventListener('change', () => callback(this.e.guidanceMode.value)); }
  setGuidanceMode(mode) { if (this.e.guidanceMode && (mode === 'on' || mode === 'off')) this.e.guidanceMode.value = mode; }

  showDecisionResult({ text, tone, durationMs = 900 }) {
    if (!this.e.decisionResult) return;
    if (this.resultTimer) clearTimeout(this.resultTimer);
    this.e.decisionResult.textContent = text;
    this.e.decisionResult.dataset.tone = tone;
    this.e.decisionResult.hidden = false;
    this.resultTimer = setTimeout(() => this.clearDecisionResult(), durationMs);
  }

  clearDecisionResult() {
    if (this.resultTimer) clearTimeout(this.resultTimer);
    this.resultTimer = null;
    if (!this.e.decisionResult) return;
    this.e.decisionResult.hidden = true;
    this.e.decisionResult.textContent = '';
    delete this.e.decisionResult.dataset.tone;
  }

  setServeSettings({ selectedServeType, revealServeType }) {
    if (this.e.serveType && SERVE_TYPES[selectedServeType]) this.e.serveType.value = selectedServeType;
    if (this.e.revealServe) this.e.revealServe.value = revealServeType ? 'show' : 'hide';
    if (this.e.activeServe) this.e.activeServe.textContent = `Serve: ${SERVE_TYPES[selectedServeType]?.label ?? 'Random'}`;
  }

  setActiveServe(label) { if (this.e.activeServe) this.e.activeServe.textContent = `Serve: ${label}`; }
}
