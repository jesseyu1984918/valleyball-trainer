import { describe, expect, it } from 'vitest';
import { Keyboard } from '../src/input/Keyboard.js';

class FakeTarget {
  constructor() {
    this.listeners = new Map();
  }

  addEventListener(type, callback) {
    const callbacks = this.listeners.get(type) ?? [];
    callbacks.push(callback);
    this.listeners.set(type, callbacks);
  }

  dispatch(type, key, repeat = false) {
    const event = { key, repeat, preventDefault() {} };
    for (const callback of this.listeners.get(type) ?? []) callback(event);
  }
}

describe('Keyboard position shortcuts', () => {
  it('emits 1, 2, and 3 as one-shot actions', () => {
    const target = new FakeTarget();
    const keyboard = new Keyboard(target);

    target.dispatch('keydown', '1');
    target.dispatch('keydown', '2');
    target.dispatch('keydown', '3');

    expect(keyboard.consume()).toBe('1');
    expect(keyboard.consume()).toBe('2');
    expect(keyboard.consume()).toBe('3');
    expect(keyboard.consume()).toBe(null);
  });

  it('ignores repeated position keydown events', () => {
    const target = new FakeTarget();
    const keyboard = new Keyboard(target);

    target.dispatch('keydown', '1', true);
    expect(keyboard.consume()).toBe(null);
  });
});
