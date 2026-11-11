import type { Card, CardType, ProfileId } from './types';

/**
 * Detects the best workload profile of the played cards (GDD 6.1).
 * Returns the profile and the ids of the cards that form it (for highlighting).
 */
export function detectProfile(cards: readonly Card[]): { id: ProfileId; cardIds: number[] } {
  if (cards.length === 0) return { id: 'single', cardIds: [] };

  const byLevel = new Map<number, Card[]>();
  const byType = new Map<CardType, Card[]>();
  for (const c of cards) {
    (byLevel.get(c.level) ?? byLevel.set(c.level, []).get(c.level)!).push(c);
    (byType.get(c.type) ?? byType.set(c.type, []).get(c.type)!).push(c);
  }
  const groups = [...byLevel.entries()].sort((a, b) => b[1].length - a[1].length || b[0] - a[0]);
  const ids = (cs: Card[]) => cs.map((c) => c.id);

  // 10 Optimierte Pipeline: 5 consecutive levels of one type
  for (const [, cs] of byType) {
    const run = findStraight(cs);
    if (run) return { id: 'optpipe', cardIds: ids(run) };
  }
  // 9 Quad-Core
  if (groups[0]![1].length >= 4) return { id: 'quadcore', cardIds: ids(groups[0]![1].slice(0, 4)) };
  // 8 Full Stack: 3 + 2
  if (groups[0]![1].length >= 3 && groups.length > 1 && groups[1]![1].length >= 2) {
    return { id: 'fullstack', cardIds: [...ids(groups[0]![1].slice(0, 3)), ...ids(groups[1]![1].slice(0, 2))] };
  }
  // 7 Spezialisiert: 5 of one type
  for (const [, cs] of byType) {
    if (cs.length >= 5) return { id: 'special', cardIds: ids(cs.slice(0, 5)) };
  }
  // 6 Pipeline: 5 consecutive levels
  const straight = findStraight(cards);
  if (straight) return { id: 'pipeline', cardIds: ids(straight) };
  // 5 Triple-Buffer
  if (groups[0]![1].length >= 3) return { id: 'triple', cardIds: ids(groups[0]![1].slice(0, 3)) };
  // 4 Heterogen: all four types
  if (byType.size === 4) {
    return { id: 'hetero', cardIds: [...byType.values()].map((cs) => cs[0]!.id) };
  }
  // 3 Quad-Channel: 2 pairs
  if (groups[0]![1].length >= 2 && groups.length > 1 && groups[1]![1].length >= 2) {
    return { id: 'quadch', cardIds: [...ids(groups[0]![1].slice(0, 2)), ...ids(groups[1]![1].slice(0, 2))] };
  }
  // 2 Dual-Channel
  if (groups[0]![1].length >= 2) return { id: 'dual', cardIds: ids(groups[0]![1].slice(0, 2)) };
  // 1 Einzeltask: highest card
  let hi = cards[0]!;
  for (const c of cards) if (c.level > hi.level) hi = c;
  return { id: 'single', cardIds: [hi.id] };
}

/** Finds 5 cards with consecutive levels (highest straight first). */
function findStraight(cards: readonly Card[]): Card[] | null {
  if (cards.length < 5) return null;
  const firstOfLevel = new Map<number, Card>();
  for (const c of cards) if (!firstOfLevel.has(c.level)) firstOfLevel.set(c.level, c);
  for (let top = 10; top >= 5; top--) {
    const run: Card[] = [];
    for (let lv = top; lv > top - 5; lv--) {
      const c = firstOfLevel.get(lv);
      if (!c) break;
      run.push(c);
    }
    if (run.length === 5) return run.reverse();
  }
  return null;
}
