import { describe, expect, it } from 'vitest';
import { buildDecisionFeedback } from './DecisionFeedback.js';

describe('buildDecisionFeedback', () => {
  it('returns the two correct messages', () => {
    expect(buildDecisionFeedback({ correct: true, expectedCall: 'mine' })).toEqual({
      text: 'CORRECT — MINE',
      tone: 'correct'
    });
    expect(buildDecisionFeedback({ correct: true, expectedCall: 'leave' })).toEqual({
      text: 'CORRECT — LEAVE',
      tone: 'correct'
    });
  });

  it('bases wrong messages on the expected call', () => {
    expect(buildDecisionFeedback({ correct: false, expectedCall: 'mine' })).toEqual({
      text: 'WRONG — YOU SHOULD TAKE IT',
      tone: 'wrong'
    });
    expect(buildDecisionFeedback({ correct: false, expectedCall: 'leave' })).toEqual({
      text: 'WRONG — LET YOUR TEAMMATE TAKE IT',
      tone: 'wrong'
    });
  });
});
