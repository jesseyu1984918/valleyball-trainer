import { describe, expect, it } from 'vitest';
import { ROUND_TIMING } from '../config.js';
import { classifyCall, shouldFinalizeMove } from './PostCallFlow.js';

describe('post-call round flow', () => {
  it('sends only a correct MINE into move', () => {
    expect(classifyCall({ call: 'mine', decision: { expectedCall: 'mine' } })).toBe('move');
    expect(classifyCall({ call: 'leave', decision: { expectedCall: 'leave' } })).toBe('feedback');
    expect(classifyCall({ call: 'leave', decision: { expectedCall: 'mine' } })).toBe('feedback');
    expect(classifyCall({ call: 'mine', decision: { expectedCall: 'leave' } })).toBe('feedback');
    expect(classifyCall({ call: null, decision: { expectedCall: 'mine' } })).toBe('feedback');
  });

  it('finalizes movement at the receive progress threshold', () => {
    expect(shouldFinalizeMove(ROUND_TIMING.decisionPlaneProgress - 0.001)).toBe(false);
    expect(shouldFinalizeMove(ROUND_TIMING.decisionPlaneProgress)).toBe(true);
    expect(shouldFinalizeMove(1)).toBe(true);
  });
});
