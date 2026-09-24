// In a Grove — Revised Edition (2021) rules that both sides need.
import type { FigureValue, MurderRule } from './types';

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 5;
export const CHIPS_PER_PLAYER = 7;
/** A case that leaves anyone with this many penalty chips ends the game. */
export const PENALTY_LIMIT = 5;
export const SUSPECT_COUNT = 3;

/** 2–3 players: no X. 4 players: one X. 5 players: both X. */
export function figuresFor(playerCount: number): FigureValue[] {
  const figures: FigureValue[] = [2, 3, 4, 5, 6, 7, 8];
  if (playerCount >= 4) figures.push('X');
  if (playerCount >= 5) figures.push('X');
  return figures;
}

/**
 * Among the three suspects: X is never the murderer; if a 5 is present the
 * smallest number did it, otherwise the largest number did it.
 */
export function findMurderer(suspects: FigureValue[]): { index: number; rule: MurderRule } {
  const numbered = suspects
    .map((v, index) => ({ v, index }))
    .filter((s): s is { v: number; index: number } => s.v !== 'X');
  if (numbered.length === 0) throw new Error('No numbered suspect');
  if (numbered.length === 1) return { index: numbered[0].index, rule: 'only' };
  const hasFive = numbered.some((s) => s.v === 5);
  const pick = numbered.reduce((best, s) => (hasFive ? s.v < best.v : s.v > best.v) ? s : best);
  return { index: pick.index, rule: hasFive ? 'five' : 'highest' };
}

export function figureLabel(v: FigureValue): string {
  return v === 'X' ? 'X' : String(v);
}

export const RULE_TEXT: Record<MurderRule, string> = {
  highest: 'Số lớn nhất là hung thủ',
  five: 'Có số 5 → số nhỏ nhất là hung thủ',
  only: 'X luôn vô tội → nghi phạm còn lại là hung thủ',
};
