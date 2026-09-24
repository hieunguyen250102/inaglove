import { randomUUID } from 'node:crypto';
import {
  CHIPS_PER_PLAYER,
  MAX_PLAYERS,
  MIN_PLAYERS,
  PENALTY_LIMIT,
  SUSPECT_COUNT,
  figureLabel,
  figuresFor,
  findMurderer,
  RULE_TEXT,
} from '../../shared/rules';
import {
  CHIP_COLORS,
  type ChatMessage,
  type Chip,
  type ChipColor,
  type FigureValue,
  type GameOverInfo,
  type GameView,
  type LastAction,
  type Phase,
  type RevealInfo,
  type RoundSummary,
  type StackOutcome,
} from '../../shared/types';

export class GameError extends Error {}

/** How long a disconnected player's turn waits before it is played for them. */
export const AUTOPLAY_AFTER_MS = 20_000;
const CHAT_HISTORY = 120;

interface Player {
  id: string;
  token: string;
  name: string;
  color: ChipColor;
  sockets: number;
  disconnectedAt: number | null;
  detective: number;
  placed: number;
  penaltyChips: Chip[];
  removed: number;
  alibiReady: boolean;
  continueReady: boolean;
}

interface Spectator {
  id: string;
  token: string;
  name: string;
  sockets: number;
}

interface Round {
  number: number;
  discovererId: string;
  turnOrder: string[];
  turnIndex: number;
  suspects: FigureValue[];
  victim: FigureValue;
  faceUp: FigureValue | null;
  hands: Record<string, FigureValue>;
  alibiFrom: Record<string, string>;
  known: Record<string, Record<number, FigureValue>>;
  unseenSuspect: number | null;
  lockedSuspect: number | null;
  stacks: Chip[][];
  peekedThisTurn: number[];
  turnStartedAt: number;
  reveal: RevealInfo | null;
}

export class Room {
  players: Player[] = [];
  spectators: Spectator[] = [];
  phase: Phase = 'lobby';
  round: Round | null = null;
  gameOver: GameOverInfo | null = null;
  history: RoundSummary[] = [];
  chat: ChatMessage[] = [];
  lastAction: LastAction = { seq: 0, type: 'none' };
  hostId: string | null = null;
  emptySince: number | null = Date.now();
  private seq = 0;

  constructor(
    readonly code: string,
    private readonly rng: () => number = Math.random,
    private readonly now: () => number = Date.now,
  ) {}

  // ───────────── membership ─────────────

  join(rawName: string, token?: string): { token: string; id: string } {
    const existing = token ? this.byToken(token) : null;
    if (existing) return { token: existing.token, id: existing.id };

    const name = cleanName(rawName);
    const newToken = randomUUID();
    const id = randomUUID().slice(0, 8);
    if (this.phase === 'lobby' && this.players.length < MAX_PLAYERS) {
      const color = CHIP_COLORS.find((c) => !this.players.some((p) => p.color === c))!;
      this.players.push(this.newPlayer(id, newToken, name, color));
      this.hostId ??= id;
      this.system(`${name} đã vào phòng.`);
    } else {
      this.spectators.push({ id, token: newToken, name, sockets: 0 });
      this.system(`${name} vào xem.`);
    }
    return { token: newToken, id };
  }

  connect(token: string) {
    const member = this.byToken(token);
    if (!member) throw new GameError('Không tìm thấy người chơi trong phòng.');
    member.sockets++;
    if ('disconnectedAt' in member) member.disconnectedAt = null;
    this.emptySince = null;
  }

  disconnect(token: string) {
    const member = this.byToken(token);
    if (!member) return;
    member.sockets = Math.max(0, member.sockets - 1);
    if ('disconnectedAt' in member && member.sockets === 0) {
      member.disconnectedAt = this.now();
      this.checkAllReady();
    }
    if (this.connectedCount() === 0) this.emptySince = this.now();
  }

  leave(token: string) {
    const spectatorIdx = this.spectators.findIndex((s) => s.token === token);
    if (spectatorIdx >= 0) {
      this.spectators.splice(spectatorIdx, 1);
      return;
    }
    const player = this.players.find((p) => p.token === token);
    if (!player) return;
    if (this.phase === 'lobby') {
      this.players = this.players.filter((p) => p !== player);
      this.system(`${player.name} đã rời phòng.`);
    } else {
      // Mid-game the seat stays; their turns are auto-played.
      player.sockets = 0;
      player.disconnectedAt = 0;
      player.token = `left:${randomUUID()}`;
      this.system(`${player.name} đã rời ván — lượt của họ sẽ được chơi tự động.`);
      this.checkAllReady();
    }
    if (this.hostId === player.id) this.pickNewHost();
    if (this.connectedCount() === 0) this.emptySince = this.now();
  }

  kick(byId: string, targetId: string) {
    this.requireHost(byId);
    if (this.phase !== 'lobby') throw new GameError('Chỉ có thể mời ra khi đang ở sảnh chờ.');
    const target = this.players.find((p) => p.id === targetId);
    if (!target || target.id === byId) throw new GameError('Không thể mời người này ra.');
    this.players = this.players.filter((p) => p !== target);
    this.system(`${target.name} đã bị mời ra khỏi phòng.`);
    return target.token;
  }

  setColor(id: string, color: ChipColor) {
    if (this.phase !== 'lobby') throw new GameError('Chỉ đổi màu được ở sảnh chờ.');
    if (!CHIP_COLORS.includes(color)) throw new GameError('Màu không hợp lệ.');
    const player = this.requirePlayer(id);
    if (this.players.some((p) => p !== player && p.color === color)) throw new GameError('Màu này đã có người chọn.');
    player.color = color;
  }

  // ───────────── game flow ─────────────

  start(byId: string) {
    this.requireHost(byId);
    if (this.phase !== 'lobby') throw new GameError('Ván đã bắt đầu.');
    if (this.players.length < MIN_PLAYERS) throw new GameError(`Cần ít nhất ${MIN_PLAYERS} người chơi.`);
    for (const p of this.players) {
      p.detective = CHIPS_PER_PLAYER;
      p.placed = 0;
      p.penaltyChips = [];
      p.removed = 0;
    }
    this.history = [];
    this.gameOver = null;
    const first = this.players[Math.floor(this.rng() * this.players.length)];
    this.system(`Ván mới bắt đầu với ${this.players.length} thám tử.`);
    this.startRound(first.id, 1);
  }

  private startRound(discovererId: string, number: number) {
    const n = this.players.length;
    const deck = shuffle(figuresFor(n), this.rng);
    const hands: Record<string, FigureValue> = {};
    this.players.forEach((p, i) => (hands[p.id] = deck[i]));
    const suspects = deck.slice(n, n + SUSPECT_COUNT);
    const victim = deck[n + SUSPECT_COUNT];
    const faceUp = n === 2 ? deck[n + SUSPECT_COUNT + 1] : null;

    // Each player passes their figure to the right, i.e. you receive from the next seat.
    const alibiFrom: Record<string, string> = {};
    this.players.forEach((p, i) => (alibiFrom[p.id] = this.players[(i + 1) % n].id));

    const start = this.players.findIndex((p) => p.id === discovererId);
    const turnOrder = this.players.map((_, i) => this.players[(start + i) % n].id);

    this.round = {
      number,
      discovererId,
      turnOrder,
      turnIndex: 0,
      suspects,
      victim,
      faceUp,
      hands,
      alibiFrom,
      known: Object.fromEntries(this.players.map((p) => [p.id, {}])),
      unseenSuspect: null,
      lockedSuspect: null,
      stacks: [[], [], []],
      peekedThisTurn: [],
      turnStartedAt: this.now(),
      reveal: null,
    };
    for (const p of this.players) {
      p.alibiReady = false;
      p.continueReady = false;
    }
    this.phase = 'alibi';
    this.action({ type: 'roundStart' });
    this.system(`Vụ án #${number}: ${this.name(discovererId)} là người đi đầu.`);
    this.checkAllReady();
  }

  alibiReady(id: string) {
    if (this.phase !== 'alibi') throw new GameError('Không phải lúc kiểm tra ngoại phạm.');
    this.requirePlayer(id).alibiReady = true;
    this.checkAllReady();
  }

  allowedPeeks(id: string): number[] {
    const r = this.round;
    if (!r || this.phase !== 'investigate' || this.currentPlayerId() !== id) return [];
    if (r.peekedThisTurn.length >= 2) return [];
    return [0, 1, 2].filter((s) => s !== r.lockedSuspect && !r.peekedThisTurn.includes(s));
  }

  peek(id: string, suspect: number) {
    const r = this.requireTurn(id);
    if (!this.allowedPeeks(id).includes(suspect)) throw new GameError('Bạn không thể xem nghi phạm này.');
    r.peekedThisTurn.push(suspect);
    r.known[id][suspect] = r.suspects[suspect];
    if (r.turnIndex === 0 && r.peekedThisTurn.length === 2) {
      r.unseenSuspect = [0, 1, 2].find((s) => !r.peekedThisTurn.includes(s))!;
    }
    this.action({ type: 'peek', playerId: id, suspect });
  }

  accuse(id: string, suspect: number) {
    const r = this.requireTurn(id);
    if (r.peekedThisTurn.length < 2) throw new GameError('Hãy xem đủ hai nghi phạm trước khi buộc tội.');
    if (![0, 1, 2].includes(suspect)) throw new GameError('Nghi phạm không hợp lệ.');
    const player = this.requirePlayer(id);
    if (player.detective <= 0) throw new GameError('Bạn đã hết chip thám tử.');
    const chip: Chip = { id: `${id}:${player.placed}`, ownerId: id, color: player.color };
    player.placed++;
    player.detective--;
    r.stacks[suspect].push(chip);
    r.lockedSuspect = suspect;
    this.action({ type: 'accuse', playerId: id, suspect, chipId: chip.id });

    r.turnIndex++;
    r.peekedThisTurn = [];
    r.turnStartedAt = this.now();
    if (r.turnIndex >= r.turnOrder.length) this.reveal();
  }

  private reveal() {
    const r = this.round!;
    const { index: murderer, rule } = findMurderer(r.suspects);
    const outcomes: StackOutcome[] = [];
    const penalties: Record<string, number> = {};
    r.stacks.forEach((chips, suspect) => {
      if (chips.length === 0) return;
      const correct = suspect === murderer;
      const collectorId = correct ? null : chips[chips.length - 1].ownerId;
      outcomes.push({ suspect, correct, collectorId, chips: [...chips] });
      if (correct) {
        for (const chip of chips) this.requirePlayer(chip.ownerId).removed++;
      } else {
        this.requirePlayer(collectorId!).penaltyChips.push(...chips);
        penalties[collectorId!] = (penalties[collectorId!] ?? 0) + chips.length;
      }
    });
    r.reveal = {
      suspects: [...r.suspects],
      victim: r.victim,
      hands: { ...r.hands },
      faceUp: r.faceUp,
      murderer,
      rule,
      outcomes,
    };
    this.history.push({ number: r.number, murdererValue: r.suspects[murderer], rule, penalties });
    this.phase = 'reveal';
    for (const p of this.players) p.continueReady = false;
    this.action({ type: 'reveal' });

    this.system(`Hung thủ là số ${figureLabel(r.suspects[murderer])} (${RULE_TEXT[rule]}).`);
    for (const [pid, count] of Object.entries(penalties)) {
      this.system(`${this.name(pid)} nhận ${count} chip phạt.`);
    }

    const overLimit = this.players.some((p) => p.penaltyChips.length >= PENALTY_LIMIT);
    const outOfChips = this.players.some((p) => p.detective === 0);
    if (overLimit || outOfChips) this.gameOver = this.computeGameOver(overLimit ? 'penalty' : 'chips');
  }

  /** Fewest penalties ranks best; ties go against whoever accused earlier in the final case. */
  private computeGameOver(reason: GameOverInfo['reason']): GameOverInfo {
    const order = this.round!.turnOrder;
    const ranking = [...this.players]
      .sort((a, b) => a.penaltyChips.length - b.penaltyChips.length || order.indexOf(b.id) - order.indexOf(a.id))
      .map((p) => p.id);
    return { loserId: ranking[ranking.length - 1], ranking, reason };
  }

  continue(id: string) {
    if (this.phase !== 'reveal') throw new GameError('Chưa thể sang vụ án tiếp theo.');
    this.requirePlayer(id).continueReady = true;
    this.checkAllReady();
  }

  restart(byId: string) {
    this.requireHost(byId);
    if (this.phase !== 'gameover') throw new GameError('Ván chưa kết thúc.');
    // Drop seats of players who left, then seat spectators while there is room.
    this.players = this.players.filter((p) => !p.token.startsWith('left:'));
    while (this.spectators.length && this.players.length < MAX_PLAYERS) {
      const s = this.spectators.shift()!;
      const color = CHIP_COLORS.find((c) => !this.players.some((p) => p.color === c))!;
      const player = this.newPlayer(s.id, s.token, s.name, color);
      player.sockets = s.sockets;
      player.disconnectedAt = s.sockets ? null : this.now();
      this.players.push(player);
    }
    if (!this.players.some((p) => p.id === this.hostId)) this.pickNewHost();
    this.phase = 'lobby';
    this.round = null;
    this.gameOver = null;
    this.action({ type: 'none' });
    this.system('Trở lại sảnh chờ cho ván mới.');
  }

  private checkAllReady() {
    const connected = this.players.filter((p) => p.sockets > 0);
    if (this.phase === 'alibi' && connected.every((p) => p.alibiReady)) {
      this.phase = 'investigate';
      this.round!.turnStartedAt = this.now();
    } else if (this.phase === 'reveal' && connected.every((p) => p.continueReady)) {
      if (this.gameOver) {
        this.phase = 'gameover';
        this.system(`${this.name(this.gameOver.loserId)} là thám tử tệ nhất và thua cuộc!`);
      } else {
        this.startRound(this.nextDiscoverer(), this.round!.number + 1);
      }
    }
  }

  /** Revised rules: the player with the most penalty chips starts the next case. */
  private nextDiscoverer(): string {
    const current = this.players.findIndex((p) => p.id === this.round!.discovererId);
    const n = this.players.length;
    const clockwise = this.players.map((_, i) => this.players[(current + 1 + i) % n]);
    const most = Math.max(...this.players.map((p) => p.penaltyChips.length));
    return (most > 0 ? clockwise.find((p) => p.penaltyChips.length === most)! : clockwise[0]).id;
  }

  /** Called periodically; plays a disconnected player's turn once they've been gone long enough. */
  tick(): boolean {
    if (this.phase !== 'investigate') return false;
    const r = this.round!;
    const current = this.requirePlayer(this.currentPlayerId()!);
    if (current.sockets > 0 || current.disconnectedAt === null) return false;
    const waitedFrom = Math.max(current.disconnectedAt, r.turnStartedAt);
    if (this.now() - waitedFrom < AUTOPLAY_AFTER_MS) return false;
    while (r.peekedThisTurn.length < 2) {
      const options = this.allowedPeeks(current.id);
      this.peek(current.id, options[Math.floor(this.rng() * options.length)]);
    }
    const target = Math.floor(this.rng() * SUSPECT_COUNT);
    this.system(`${current.name} vắng mặt — hệ thống buộc tội thay.`);
    this.accuse(current.id, target);
    return true;
  }

  // ───────────── views ─────────────

  viewFor(token: string): GameView {
    const member = this.byToken(token);
    const youId = member?.id ?? '';
    const youAreSpectator = !this.players.some((p) => p.id === youId);
    const r = this.round;
    const showPrivate = r && !youAreSpectator && this.phase !== 'lobby';
    return {
      code: this.code,
      phase: this.phase,
      players: this.players.map((p) => ({
        id: p.id,
        name: p.name,
        color: p.color,
        connected: p.sockets > 0,
        isHost: p.id === this.hostId,
        detective: p.detective,
        penaltyChips: p.penaltyChips,
        removed: p.removed,
        alibiReady: p.alibiReady,
        continueReady: p.continueReady,
      })),
      spectators: this.spectators.map((s) => ({ id: s.id, name: s.name, connected: s.sockets > 0 })),
      youId,
      youAreSpectator,
      round: r && {
        number: r.number,
        discovererId: r.discovererId,
        turnOrder: r.turnOrder,
        turnIndex: r.turnIndex,
        currentPlayerId: this.currentPlayerId(),
        unseenSuspect: r.unseenSuspect,
        lockedSuspect: r.lockedSuspect,
        stacks: r.stacks,
        peekedThisTurn: r.peekedThisTurn,
        faceUp: r.faceUp,
        reveal: r.reveal,
      },
      private: showPrivate
        ? {
            hand: r.hands[youId],
            alibi: r.hands[r.alibiFrom[youId]],
            alibiFromId: r.alibiFrom[youId],
            known: r.known[youId] ?? {},
          }
        : null,
      lastAction: this.lastAction,
      gameOver: this.phase === 'gameover' || this.phase === 'reveal' ? this.gameOver : null,
      history: this.history,
    };
  }

  currentPlayerId(): string | null {
    const r = this.round;
    if (!r || this.phase !== 'investigate') return null;
    return r.turnOrder[r.turnIndex] ?? null;
  }

  memberId(token: string) {
    return this.byToken(token)?.id ?? null;
  }

  memberName(token: string) {
    return this.byToken(token)?.name ?? null;
  }

  colorOf(id: string): ChipColor | null {
    return this.players.find((p) => p.id === id)?.color ?? null;
  }

  connectedCount() {
    return this.players.reduce((n, p) => n + p.sockets, 0) + this.spectators.reduce((n, s) => n + s.sockets, 0);
  }

  // ───────────── chat ─────────────

  onMessage: (msg: ChatMessage) => void = () => {};

  say(token: string, rawText: string): ChatMessage {
    const member = this.byToken(token);
    if (!member) throw new GameError('Bạn không ở trong phòng.');
    const text = rawText.replace(/\s+/g, ' ').trim().slice(0, 280);
    if (!text) throw new GameError('Tin nhắn trống.');
    return this.pushChat({
      id: randomUUID(),
      kind: 'chat',
      playerId: member.id,
      name: member.name,
      color: this.colorOf(member.id),
      text,
      ts: this.now(),
    });
  }

  system(text: string) {
    this.pushChat({ id: randomUUID(), kind: 'system', text, ts: this.now() });
  }

  private pushChat(msg: ChatMessage) {
    this.chat.push(msg);
    if (this.chat.length > CHAT_HISTORY) this.chat.splice(0, this.chat.length - CHAT_HISTORY);
    this.onMessage(msg);
    return msg;
  }

  // ───────────── helpers ─────────────

  private newPlayer(id: string, token: string, name: string, color: ChipColor): Player {
    return {
      id,
      token,
      name,
      color,
      sockets: 0,
      disconnectedAt: null,
      detective: CHIPS_PER_PLAYER,
      placed: 0,
      penaltyChips: [],
      removed: 0,
      alibiReady: false,
      continueReady: false,
    };
  }

  private byToken(token: string): Player | Spectator | null {
    return this.players.find((p) => p.token === token) ?? this.spectators.find((s) => s.token === token) ?? null;
  }

  private requirePlayer(id: string): Player {
    const p = this.players.find((p) => p.id === id);
    if (!p) throw new GameError('Bạn đang xem, không phải người chơi.');
    return p;
  }

  private requireHost(id: string) {
    if (id !== this.hostId) throw new GameError('Chỉ chủ phòng mới làm được việc này.');
  }

  private requireTurn(id: string): Round {
    if (this.phase !== 'investigate' || !this.round) throw new GameError('Không phải lúc điều tra.');
    if (this.currentPlayerId() !== id) throw new GameError('Chưa đến lượt bạn.');
    return this.round;
  }

  private pickNewHost() {
    const next = this.players.find((p) => p.sockets > 0) ?? this.players[0];
    this.hostId = next?.id ?? null;
    if (next) this.system(`${next.name} trở thành chủ phòng.`);
  }

  private name(id: string) {
    return this.players.find((p) => p.id === id)?.name ?? '???';
  }

  private action(a: DistributiveOmit<LastAction, 'seq'>) {
    this.lastAction = { ...a, seq: ++this.seq } as LastAction;
  }
}

type DistributiveOmit<T, K extends keyof any> = T extends any ? Omit<T, K> : never;

function cleanName(raw: string) {
  const name = String(raw ?? '').replace(/\s+/g, ' ').trim().slice(0, 16);
  if (!name) throw new GameError('Hãy nhập tên của bạn.');
  return name;
}

export function shuffle<T>(items: T[], rng: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
