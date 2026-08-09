import { describe, expect, it, vi } from 'vitest';
import { Hud } from './Hud.js';

function element() {
  const listeners = {};
  return {
    textContent: '',
    hidden: true,
    dataset: {},
    classList: { toggle() {} },
    setAttribute() {},
    addEventListener(type, callback) { listeners[type] = callback; },
    listeners
  };
}

function makeHud() {
  const trainingPause = element();
  const pauseMessage = element();
  const nodes = { '#training-pause': trainingPause, '#pause-message': pauseMessage };
  const doc = {
    querySelector(selector) { return nodes[selector] ?? element(); },
    querySelectorAll() { return []; }
  };
  return { hud: new Hud(doc), trainingPause, pauseMessage };
}

describe('training pause HUD', () => {
  it('emits pause button clicks', () => {
    const { hud, trainingPause } = makeHud();
    const callback = vi.fn();
    hud.onTrainingPause(callback);
    trainingPause.listeners.click();
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('switches between Pause and Start Next Round', () => {
    const { hud, trainingPause, pauseMessage } = makeHud();
    hud.setTrainingPaused(true);
    expect(trainingPause.textContent).toBe('Start Next Round');
    expect(pauseMessage.hidden).toBe(false);
    expect(pauseMessage.textContent).toContain('PAUSED');

    hud.setTrainingPaused(false);
    expect(trainingPause.textContent).toBe('Pause');
    expect(pauseMessage.hidden).toBe(true);
  });
});
