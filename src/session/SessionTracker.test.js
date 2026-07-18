import { describe, expect, it } from 'vitest';
import { SessionTracker } from './SessionTracker.js';

const attempts = [
  {
    timestamp: '2026-07-18T05:00:00.000Z',
    controlled_position: 'left',
    serve_type: 'standingFloat',
    expected_call: 'mine',
    actual_call: 'mine',
    correct: true,
    reaction_ms: 1000,
    decision_points: 60,
    movement_points: 20,
    reaction_points: 10,
    penalty: 0,
    total_score: 90,
    owner_position: 'left',
    landing_x: -2.5,
    landing_z: 7.1
  },
  {
    timestamp: '2026-07-18T05:00:05.000Z',
    controlled_position: 'right',
    serve_type: 'jumpTopspin',
    expected_call: 'leave',
    actual_call: 'mine',
    correct: false,
    reaction_ms: 1400,
    decision_points: 0,
    movement_points: 10,
    reaction_points: 8,
    penalty: 0,
    total_score: 18,
    owner_position: 'middle',
    landing_x: 0.2,
    landing_z: 7.8
  },
  {
    timestamp: '2026-07-18T05:00:10.000Z',
    controlled_position: 'left',
    serve_type: 'standingFloat',
    expected_call: 'mine',
    actual_call: null,
    correct: false,
    reaction_ms: 1600,
    decision_points: 0,
    movement_points: 0,
    reaction_points: 5,
    penalty: 0,
    total_score: 5,
    owner_position: 'left',
    landing_x: -2.1,
    landing_z: 6.9
  }
];

describe('SessionTracker', () => {
  it('starts empty and records immutable normalized attempts', () => {
    const tracker = new SessionTracker({
      now: () => new Date('2026-07-18T05:00:00.000Z'),
      idFactory: () => 'session-1'
    });
    expect(tracker.sessionId).toBe('session-1');
    expect(tracker.startedAt).toBe('2026-07-18T05:00:00.000Z');
    expect(tracker.getAttempts()).toEqual([]);

    const input = { ...attempts[0] };
    const recorded = tracker.recordAttempt(input);
    input.correct = false;
    expect(recorded.session_id).toBe('session-1');
    expect(recorded.attempt_number).toBe(1);
    expect(tracker.getAttempts()[0].correct).toBe(true);
  });

  it('computes overall, category, score, reaction, and mistake metrics', () => {
    const tracker = new SessionTracker({
      now: () => new Date('2026-07-18T05:00:00.000Z'),
      idFactory: () => 'session-1'
    });
    attempts.forEach((attempt) => tracker.recordAttempt(attempt));

    const summary = tracker.getSummary({
      username: ' Alex ',
      endedAt: new Date('2026-07-18T05:10:00.000Z')
    });

    expect(summary).toMatchObject({
      username: 'Alex',
      total_attempts: 3,
      correct_attempts: 1,
      incorrect_attempts: 2,
      accuracy_percent: 33.3,
      average_reaction_ms: 1333.3,
      total_score: 113,
      average_score: 37.7,
      left_accuracy_percent: 50,
      right_accuracy_percent: 0,
      middle_accuracy_percent: '',
      standing_float_accuracy_percent: 50,
      jump_topspin_accuracy_percent: 0,
      jump_float_accuracy_percent: '',
      short_float_accuracy_percent: '',
      deep_topspin_accuracy_percent: '',
      mine_when_leave_expected: 1,
      leave_when_mine_expected: 0,
      missed_call_count: 1
    });
  });

  it('reset creates a fresh session and clears attempts', () => {
    let id = 0;
    const tracker = new SessionTracker({
      now: () => new Date('2026-07-18T05:00:00.000Z'),
      idFactory: () => `session-${++id}`
    });
    tracker.recordAttempt(attempts[0]);
    tracker.reset();
    expect(tracker.sessionId).toBe('session-2');
    expect(tracker.getAttempts()).toEqual([]);
  });
});
