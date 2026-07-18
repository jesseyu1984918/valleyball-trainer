import { RECEIVER_POSITIONS } from '../config.js';

export class Hud {
  constructor(doc = document) {
    this.e = {
      score: doc.querySelector('#score'),
      streak: doc.querySelector('#streak'),
      reaction: doc.querySelector('#reaction'),
      state: doc.querySelector('#round-state'),
      feedback: doc.querySelector('#feedback'),
      controlledPosition: doc.querySelector('#controlled-position')
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
}
