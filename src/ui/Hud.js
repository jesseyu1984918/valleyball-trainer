import { RECEIVER_POSITIONS, SERVE_TYPES } from '../config.js';

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
      activeServe: doc.querySelector('#active-serve')
    };
    this.positionButtons = [...doc.querySelectorAll('[data-position]')];
  }

  update({ score, streak, reaction, state, feedback }) {
    if (score !== undefined) this.e.score.textContent = score;
    if (streak !== undefined) this.e.streak.textContent = streak;
    if (reaction !== undefined) this.e.reaction.textContent = reaction;
    if (state !== undefined) this.e.state.textContent = state;
    if (feedback !== undefined) this.e.feedback.textContent = feedback;
  }

  onPositionSelect(callback) {
    for (const button of this.positionButtons) {
      button.addEventListener('click', () => callback(button.dataset.position));
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

  onServeTypeSelect(callback) {
    this.e.serveType?.addEventListener('change', () => callback(this.e.serveType.value));
  }

  onRevealServeChange(callback) {
    this.e.revealServe?.addEventListener('change', () => callback(this.e.revealServe.value === 'show'));
  }

  setServeSettings({ selectedServeType, revealServeType }) {
    if (this.e.serveType && SERVE_TYPES[selectedServeType]) this.e.serveType.value = selectedServeType;
    if (this.e.revealServe) this.e.revealServe.value = revealServeType ? 'show' : 'hide';
    if (this.e.activeServe) this.e.activeServe.textContent = `Serve: ${SERVE_TYPES[selectedServeType]?.label ?? 'Random'}`;
  }

  setActiveServe(label) {
    if (this.e.activeServe) this.e.activeServe.textContent = `Serve: ${label}`;
  }
}