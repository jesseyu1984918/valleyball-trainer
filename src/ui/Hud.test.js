import { afterEach, describe, expect, it, vi } from 'vitest';
import { Hud } from './Hud.js';

function element(value = '') {
  const listeners = {};
  const classes = new Set();
  return {
    value,
    textContent: '',
    hidden: true,
    dataset: {},
    listeners,
    classList: { toggle(name, on) { on ? classes.add(name) : classes.delete(name); } },
    setAttribute() {},
    addEventListener(type, callback) { listeners[type] = callback; }
  };
}

function makeHud() {
  const difficulty = element('medium');
  const guidanceMode = element('guided');
  const decisionResult = element();
  const nodes = {
    '#difficulty': difficulty,
    '#guidance-mode': guidanceMode,
    '#decision-result': decisionResult
  };
  const doc = {
    querySelector(selector) { return nodes[selector] ?? element(); },
    querySelectorAll() { return []; }
  };
  return { hud: new Hud(doc), difficulty, guidanceMode, decisionResult };
}

afterEach(() => vi.useRealTimers());

describe('Hud difficulty and decision result', () => {
  it('defaults difficulty UI to medium', () => {
    const { hud, difficulty } = makeHud();
    hud.setDifficulty('medium');
    expect(difficulty.value).toBe('medium');
  });

  it('emits selected difficulty changes', () => {
    const { hud, difficulty } = makeHud();
    const callback = vi.fn();
    hud.onDifficultyChange(callback);
    difficulty.value = 'difficult';
    difficulty.listeners.change();
    expect(callback).toHaveBeenCalledWith('difficult');
  });

  it('defaults trajectory guidance UI to guided', () => {
    const { hud, guidanceMode } = makeHud();
    hud.setGuidanceMode('guided');
    expect(guidanceMode.value).toBe('guided');
  });

  it('emits trajectory guidance mode changes', () => {
    const { hud, guidanceMode } = makeHud();
    const callback = vi.fn();
    hud.onGuidanceModeChange(callback);
    guidanceMode.value = 'readFirst';
    guidanceMode.listeners.change();
    expect(callback).toHaveBeenCalledWith('readFirst');
  });

  it('shows and clears prominent decision feedback', () => {
    vi.useFakeTimers();
    const { hud, decisionResult } = makeHud();
    hud.showDecisionResult({ text: 'CORRECT — MINE', tone: 'correct', durationMs: 900 });
    expect(decisionResult.hidden).toBe(false);
    expect(decisionResult.textContent).toBe('CORRECT — MINE');
    expect(decisionResult.dataset.tone).toBe('correct');
    vi.advanceTimersByTime(899);
    expect(decisionResult.hidden).toBe(false);
    vi.advanceTimersByTime(1);
    expect(decisionResult.hidden).toBe(true);
  });

  it('replaces any existing hide timer when a new result is shown', () => {
    vi.useFakeTimers();
    const { hud, decisionResult } = makeHud();
    hud.showDecisionResult({ text: 'FIRST', tone: 'wrong', durationMs: 900 });
    vi.advanceTimersByTime(600);
    hud.showDecisionResult({ text: 'SECOND', tone: 'correct', durationMs: 900 });
    vi.advanceTimersByTime(300);
    expect(decisionResult.hidden).toBe(false);
    expect(decisionResult.textContent).toBe('SECOND');
    vi.advanceTimersByTime(600);
    expect(decisionResult.hidden).toBe(true);
  });
});
