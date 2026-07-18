export function buildAttemptRecord({
  scenario,
  controlledSlot,
  decision,
  call,
  result,
  reactionMs,
  timestamp
}) {
  return {
    timestamp: timestamp.toISOString(),
    controlled_position: controlledSlot,
    serve_type: scenario.serveType,
    expected_call: decision.expectedCall,
    actual_call: call,
    correct: result.correct,
    reaction_ms: Math.round(reactionMs),
    decision_points: result.decisionPoints,
    movement_points: result.movementPoints,
    reaction_points: result.reactionPoints,
    penalty: result.penalty,
    total_score: result.total,
    owner_position: decision.ownerId,
    landing_x: scenario.landing.x,
    landing_z: scenario.landing.z
  };
}

export function recordAttemptOnce({ tracker, attempt, alreadyRecorded }) {
  if (alreadyRecorded) return false;
  tracker.recordAttempt(attempt);
  return true;
}
