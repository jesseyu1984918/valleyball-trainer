import { describe, expect, it } from 'vitest';
import { canSelectPosition } from './ReceiverPositions.js';

describe('paused position selection', () => {
  it('allows changing controlled position after a serve had started', () => {
    expect(canSelectPosition('paused', true)).toBe(true);
  });

  it('still blocks active-serve changes after serve start', () => {
    expect(canSelectPosition('serve', true)).toBe(false);
    expect(canSelectPosition('move', true)).toBe(false);
  });
});
