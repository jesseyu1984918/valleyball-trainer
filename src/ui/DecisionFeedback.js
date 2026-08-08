export function buildDecisionFeedback({ correct, expectedCall }) {
  if (correct) {
    return {
      text: expectedCall === 'mine' ? 'CORRECT — MINE' : 'CORRECT — LEAVE',
      tone: 'correct'
    };
  }

  return {
    text: expectedCall === 'mine'
      ? 'WRONG — YOU SHOULD TAKE IT'
      : 'WRONG — LET YOUR TEAMMATE TAKE IT',
    tone: 'wrong'
  };
}
