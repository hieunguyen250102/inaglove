import { describe, expect, it } from 'vitest';
import { figuresFor, findMurderer } from '../../shared/rules';
import { AUTOPLAY_AFTER_MS, GameError, Room } from './room';

describe('findMurderer', () => {
  it('picks the highest number', () => {
    expect(findMurderer([3, 8, 6])).toEqual({ index: 1, rule: 'highest' });
  });
  it('picks the lowest number when a 5 is present', () => {
    expect(findMurderer([7, 5, 3])).toEqual({ index: 2, rule: 'five' });
    expect(findMurderer([5, 8, 6])).toEqual({ index: 0, rule: 'five' });
  });
  it('never picks X', () => {
    expect(findMurderer(['X', 2, 4])).toEqual({ index: 2, rule: 'highest' });
    expect(findMurderer(['X', 'X', 4])).toEqual({ index: 2, rule: 'only' });
    expect(findMurderer(['X', 5, 6])).toEqual({ index: 1, rule: 'five' });
  });
});

describe('figuresFor', () => {
  it('uses X figures only at 4–5 players', () => {
    expect(figuresFor(2)).toHaveLength(7);
    expect(figuresFor(3)).not.toContain('X');
    expect(figuresFor(4).filter((f) => f === 'X')).toHaveLength(1);
    expect(figuresFor(5).filter((f) => f === 'X')).toHaveLength(2);
  });
});

function setup(n: number) {
  let t = 0;
  const room = new Room('TEST', mulberry(42), () => t);
  const tokens = Array.from({ length: n }, (_, i) => {
    const { token } = room.join(`P${i}`);
    room.connect(token);
    return token;
  });
  const ids = tokens.map((tk) => room.memberId(tk)!);
  return { room, tokens, ids, advance: (ms: number) => (t += ms) };
}

function playCase(room: Room, choose: (id: string) => number) {
  for (const p of room.players) room.alibiReady(p.id);
  while (room.phase === 'investigate') {
    const id = room.currentPlayerId()!;
    while (room.allowedPeeks(id).length && room.round!.peekedThisTurn.length < 2) {
      room.peek(id, room.allowedPeeks(id)[0]);
    }
    room.accuse(id, choose(id));
  }
}

describe('Room', () => {
  it('deals hands, suspects, victim and a face-up figure for 2 players', () => {
    const { room, tokens } = setup(2);
    room.start(room.hostId!);
    const r = room.round!;
    expect(r.suspects).toHaveLength(3);
    expect(r.faceUp).not.toBeNull();
    const all = [...Object.values(r.hands), ...r.suspects, r.victim, r.faceUp];
    expect(all.sort()).toEqual(figuresFor(2).sort());
    // Each player sees the other's figure as their alibi.
    const view = room.viewFor(tokens[0]).private!;
    expect(view.alibi).toBe(r.hands[room.players[1].id]);
  });

  it('hides other players figures and unseen suspects', () => {
    const { room, tokens } = setup(3);
    room.start(room.hostId!);
    const view = room.viewFor(tokens[0]);
    expect(JSON.stringify(view.round)).not.toContain('suspects');
    expect(view.private!.known).toEqual({});
    expect(view.round!.reveal).toBeNull();
  });

  it('enforces the discoverer and follower peeking rules', () => {
    const { room } = setup(3);
    room.start(room.hostId!);
    for (const p of room.players) room.alibiReady(p.id);
    const first = room.currentPlayerId()!;
    expect(room.allowedPeeks(first)).toEqual([0, 1, 2]);
    expect(() => room.accuse(first, 0)).toThrow(GameError);
    room.peek(first, 0);
    room.peek(first, 2);
    expect(room.round!.unseenSuspect).toBe(1);
    room.accuse(first, 1);

    const second = room.currentPlayerId()!;
    expect(second).not.toBe(first);
    expect(room.allowedPeeks(second)).toEqual([0, 2]);
    expect(() => room.peek(second, 1)).toThrow(GameError);
    expect(() => room.peek(first, 0)).toThrow(GameError);
  });

  it('removes correct chips and gives wrong stacks to the top chip owner', () => {
    const { room } = setup(3);
    room.start(room.hostId!);
    const murderer = findMurderer(room.round!.suspects).index;
    const wrong = (murderer + 1) % 3;
    const order = room.round!.turnOrder;
    // First two accuse the wrong suspect, the last is right.
    playCase(room, (id) => (id === order[2] ? murderer : wrong));
    expect(room.phase).toBe('reveal');
    const top = room.players.find((p) => p.id === order[1])!;
    expect(top.penaltyChips).toHaveLength(2);
    expect(room.players.find((p) => p.id === order[2])!.removed).toBe(1);
    expect(room.players.every((p) => p.detective === 6)).toBe(true);
  });

  it('gives the next case to the player with the most penalties', () => {
    const { room } = setup(3);
    room.start(room.hostId!);
    const murderer = findMurderer(room.round!.suspects).index;
    const order = room.round!.turnOrder;
    playCase(room, (id) => (id === order[1] ? (murderer + 1) % 3 : murderer));
    for (const p of room.players) room.continue(p.id);
    expect(room.phase).toBe('alibi');
    expect(room.round!.discovererId).toBe(order[1]);
  });

  it('ends when someone reaches 5 penalty chips and ranks fewest first', () => {
    const { room } = setup(5);
    room.start(room.hostId!);
    const murderer = findMurderer(room.round!.suspects).index;
    const order = room.round!.turnOrder;
    playCase(room, () => (murderer + 1) % 3);
    expect(room.gameOver?.loserId).toBe(order[4]);
    for (const p of room.players) room.continue(p.id);
    expect(room.phase).toBe('gameover');
    room.restart(room.hostId!);
    expect(room.phase).toBe('lobby');
  });

  it('ends after the seventh case when chips run out', () => {
    const { room } = setup(4);
    room.start(room.hostId!);
    let cases = 0;
    while (room.phase !== 'gameover') {
      const murderer = findMurderer(room.round!.suspects).index;
      playCase(room, () => murderer);
      for (const p of room.players) room.continue(p.id);
      cases++;
    }
    expect(cases).toBe(7);
    expect(room.gameOver?.reason).toBe('chips');
  });

  it('auto-plays for a disconnected player after a grace period', () => {
    const { room, tokens, advance } = setup(3);
    room.start(room.hostId!);
    for (const p of room.players) room.alibiReady(p.id);
    const currentIdx = room.players.findIndex((p) => p.id === room.currentPlayerId());
    room.disconnect(tokens[currentIdx]);
    expect(room.tick()).toBe(false);
    advance(AUTOPLAY_AFTER_MS + 1);
    expect(room.tick()).toBe(true);
    expect(room.round!.turnIndex).toBe(1);
  });

  it('seats late joiners as spectators', () => {
    const { room } = setup(2);
    room.start(room.hostId!);
    const { token } = room.join('Late');
    expect(room.viewFor(token).youAreSpectator).toBe(true);
    expect(room.viewFor(token).private).toBeNull();
  });
});

function mulberry(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
