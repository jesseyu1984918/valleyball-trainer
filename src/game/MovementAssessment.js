import { SCORING } from '../config.js';
import { clamp, distance } from '../math/vector2.js';

export function assessMovement({
  player,
  target,
  playerRadius = SCORING.playerBodyRadius
}) {
  const centerDistance = distance(player, target);
  const overlapBoundary = target.radius + playerRadius;
  const outsideDistance = Math.max(0, centerDistance - overlapBoundary);

  if (outsideDistance === 0) {
    return {
      status: 'in-position',
      distance: centerDistance,
      outsideDistance: 0,
      movementPoints: SCORING.movementMax
    };
  }

  if (outsideDistance <= SCORING.closePositionBand) {
    return {
      status: 'close',
      distance: centerDistance,
      outsideDistance,
      movementPoints: Math.round(
        SCORING.movementMax * clamp(1 - outsideDistance / SCORING.closePositionBand, 0, 1)
      )
    };
  }

  return {
    status: 'missed',
    distance: centerDistance,
    outsideDistance,
    movementPoints: 0
  };
}
