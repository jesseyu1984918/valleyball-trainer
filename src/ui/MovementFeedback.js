export function buildMovementFeedback({ status, outsideDistance }) {
  if (status === 'in-position') return 'IN POSITION ✓';
  const meters = outsideDistance.toFixed(1);
  if (status === 'close') return `CLOSE — ${meters} m OUTSIDE`;
  return `MISSED POSITION — ${meters} m OUTSIDE`;
}
