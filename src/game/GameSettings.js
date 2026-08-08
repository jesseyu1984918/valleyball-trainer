import { DIFFICULTIES } from '../config.js';

export function resolveGeneratorDifficulty(selectedDifficulty) {
  return DIFFICULTIES[selectedDifficulty]?.generatorValue ?? 'normal';
}
