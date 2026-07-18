import { describe, expect, it, vi } from 'vitest';
import { buildAttemptRecord, recordAttemptOnce } from '../session/GameSessionBridge.js';

describe('game session bridge', () => {
  it('maps a scored round into the complete attempt schema', () => {
    const attempt = buildAttemptRecord({
      scenario: { serveType: 'jumpFloat', landing: { x: 1.2, z: 7.4 } },
      controlledSlot: 'right',
      decision: { expectedCall: 'leave', ownerId: 'middle' },
      call: null,
      result: {
        correct: false,
        decisionPoints: 0,
        movementPoints: 8,
        reactionPoints: 4,
        penalty: 0,
        total: 12
      },
      reactionMs: 1456.7,
      timestamp: new Date('2026-07-18T05:00:00.000Z')
    });

    expect(attempt).toEqual({
      timestamp: '2026-07-18T05:00:00.000Z',
      controlled_position: 'right',
      serve_type: 'jumpFloat',
      expected_call: 'leave',
      actual_call: null,
      correct: false,
      reaction_ms: 1457,
      decision_points: 0,
      movement_points: 8,
      reaction_points: 4,
      penalty: 0,
      total_score: 12,
      owner_position: 'middle',
      landing_x: 1.2,
      landing_z: 7.4
    });
  });

  it('records only when the guard is clear', () => {
    const tracker = { recordAttempt: vi.fn() };
    const attempt = { correct: true };
    expect(recordAttemptOnce({ tracker, attempt, alreadyRecorded: false })).toBe(true);
    expect(recordAttemptOnce({ tracker, attempt, alreadyRecorded: true })).toBe(false);
    expect(tracker.recordAttempt).toHaveBeenCalledOnce();
  });
});
