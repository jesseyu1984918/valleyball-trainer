import { SCORING } from '../config.js';
import { distance, dot, normalize, subtract } from '../math/vector2.js';

function candidateScore(receiver, landing, all) {
  const ideal = { x: landing.x, z: landing.z + SCORING.idealContactOffsetZ };
  let score = distance(receiver, ideal);
  const approach = normalize(receiver.velocity ?? { x: 0, z: 0 });
  const toBall = normalize(subtract(ideal, receiver));

  if ((receiver.speed ?? 0) > 0.05) {
    score += (1 - dot(approach, toBall)) * 0.55;
  }

  for (const other of all) {
    if (other.id === receiver.id) continue;
    const crossing =
      (receiver.x - other.x) * (landing.x - other.x) < 0 &&
      Math.abs(receiver.x - other.x) > 1.1;
    if (crossing) score += 1.1;
  }

  if (receiver.id === 'middle') score -= 0.08;
  return score;
}

export function decideOwnership({ landing, receivers, controlledSlot = 'middle' }) {
  const ranked = receivers
    .map((receiver) => ({
      ...receiver,
      ownershipScore: candidateScore(receiver, landing, receivers)
    }))
    .sort((a, b) => a.ownershipScore - b.ownershipScore);

  const owner = ranked[0];
  const margin = ranked[1].ownershipScore - owner.ownershipScore;
  const controlledOwnsBall = owner.id === controlledSlot;
  const ownerLabel = owner.id === 'left' ? 'Left' : owner.id === 'right' ? 'Right' : 'Middle';

  return {
    expectedCall: controlledOwnsBall ? 'mine' : 'leave',
    ownerId: owner.id,
    confidence: margin > 0.8 ? 'high' : margin > 0.3 ? 'medium' : 'low',
    explanation: controlledOwnsBall
      ? 'You have the shortest clean path to get behind the ball.'
      : `${ownerLabel} passer has the cleaner path and angle.`
  };
}
