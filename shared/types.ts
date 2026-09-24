// Types shared by the Socket.IO server and the React client.

export type ChipColor = 'red' | 'blue' | 'green' | 'yellow' | 'purple';
export const CHIP_COLORS: ChipColor[] = ['red', 'blue', 'green', 'yellow', 'purple'];

/** A suspect figure: 2–8, or 'X' (always innocent). */
export type FigureValue = number | 'X';

export type Phase = 'lobby' | 'alibi' | 'investigate' | 'reveal' | 'gameover';

export interface Chip {
  /** `${ownerId}:${n}` — n is the owner's nth chip (0–6), stable for layout animations. */
  id: string;
  ownerId: string;
  color: ChipColor;
}

export interface PublicPlayer {
  id: string;
  name: string;
  color: ChipColor;
  connected: boolean;
  isHost: boolean;
  /** Detective chips still in hand. */
  detective: number;
  /** Penalty ("inept detective") chips, flipped to the ! side. */
  penaltyChips: Chip[];
  /** Chips removed from the game after correct accusations. */
  removed: number;
  alibiReady: boolean;
  continueReady: boolean;
}

export interface Spectator {
  id: string;
  name: string;
  connected: boolean;
}

export type MurderRule = 'highest' | 'five' | 'only';

export interface StackOutcome {
  suspect: number;
  correct: boolean;
  /** Owner of the top chip on a wrong stack: collects the whole stack as penalties. */
  collectorId: string | null;
  chips: Chip[];
}

export interface RevealInfo {
  suspects: FigureValue[];
  victim: FigureValue;
  hands: Record<string, FigureValue>;
  faceUp: FigureValue | null;
  murderer: number;
  rule: MurderRule;
  outcomes: StackOutcome[];
}

export interface RoundView {
  number: number;
  discovererId: string;
  turnOrder: string[];
  turnIndex: number;
  currentPlayerId: string | null;
  unseenSuspect: number | null;
  lockedSuspect: number | null;
  stacks: Chip[][];
  /** Which suspects the current player has looked at this turn (not their values). */
  peekedThisTurn: number[];
  /** 2-player games: one extra figure lies face up for everyone. */
  faceUp: FigureValue | null;
  reveal: RevealInfo | null;
}

export interface PrivateView {
  hand: FigureValue;
  /** The figure passed to you during the alibi check. */
  alibi: FigureValue;
  alibiFromId: string;
  /** Suspect index → value, for suspects you have looked at this round. */
  known: Record<number, FigureValue>;
}

export interface GameOverInfo {
  loserId: string;
  /** Best first. */
  ranking: string[];
  reason: 'penalty' | 'chips';
}

export type LastAction =
  | { seq: number; type: 'roundStart' }
  | { seq: number; type: 'peek'; playerId: string; suspect: number }
  | { seq: number; type: 'accuse'; playerId: string; suspect: number; chipId: string }
  | { seq: number; type: 'reveal' }
  | { seq: number; type: 'none' };

export interface GameView {
  code: string;
  phase: Phase;
  players: PublicPlayer[];
  spectators: Spectator[];
  youId: string;
  youAreSpectator: boolean;
  round: RoundView | null;
  private: PrivateView | null;
  lastAction: LastAction;
  gameOver: GameOverInfo | null;
  history: RoundSummary[];
}

export interface RoundSummary {
  number: number;
  murdererValue: FigureValue;
  rule: MurderRule;
  penalties: Record<string, number>;
}

export interface ChatMessage {
  id: string;
  kind: 'chat' | 'system';
  playerId?: string;
  name?: string;
  color?: ChipColor | null;
  text: string;
  ts: number;
}

export interface Reaction {
  playerId: string;
  emoji: string;
  id: string;
}

export const REACTIONS = ['🤔', '😏', '😱', '👀', '🙏', '😂'] as const;

/** Acknowledgement shape for every client → server request. */
export type Ack<T = unknown> = (res: { ok: true; data?: T } | { ok: false; error: string }) => void;

export interface JoinResult {
  code: string;
  token: string;
  youId: string;
}
