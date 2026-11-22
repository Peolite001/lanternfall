// The Warden: a one-ply opponent that looks a move ahead. It values Flame, the board it
// keeps and the board it denies, so its play is readable: it trades where it gains a Keeper
// and goes for the Flame when a beacon stands open.

import { cardDef } from './cards.js';
import { charmTargets, cloneMatch, isAffordable, keeperPower, needsTarget, other, playCard } from './rules.js';

const KEEPER_VALUE = 1.05;
const WARD_VALUE = 0.42;
const FLAME_VALUE = 1.15;
const HAND_VALUE = 0.3;
const PLAY_THRESHOLD = 0.35;

export function positionValue(match, side) {
  const foe = other(side);
  let value = 0;
  for (let i = 0; i < 3; i += 1) {
    const mine = match[side].beacons[i];
    const theirs = match[foe].beacons[i];
    if (mine) value += keeperPower(match, mine, i) * KEEPER_VALUE + mine.ward * WARD_VALUE;
    if (theirs) value -= keeperPower(match, theirs, i) * KEEPER_VALUE + theirs.ward * WARD_VALUE;
    if (mine && !theirs) value += 0.9;
    if (!mine && theirs) value -= 0.9;
  }
  value += (match[side].flame - match[foe].flame) * FLAME_VALUE;
  value += (match[side].hand.length - match[foe].hand.length) * HAND_VALUE;
  value += match[side].oil * 0.08;
  return value;
}

export function candidateMoves(match, side) {
  const moves = [];
  for (const card of match[side].hand) {
    const def = cardDef(card.id);
    if (!isAffordable(match, side, card)) continue;
    if (def.kind === 'keeper') {
      for (let beacon = 0; beacon < 3; beacon += 1) {
        if (match[side].beacons[beacon]) continue;
        moves.push({ uid: card.uid, target: { owner: side, beacon } });
      }
      continue;
    }
    if (!needsTarget(def)) {
      moves.push({ uid: card.uid, target: null });
      continue;
    }
    for (const place of charmTargets(match, side, def)) moves.push({ uid: card.uid, target: place });
  }
  return moves;
}

function scoreMove(match, side, move) {
  const next = cloneMatch(match);
  const card = next[side].hand.find((held) => held.uid === move.uid);
  if (!card) return -Infinity;
  playCard(next, side, move.uid, move.target);
  if (next.over) {
    return next.over.winner === side ? 1000 : -1000;
  }
  let value = positionValue(next, side) - positionValue(match, side);
  const def = cardDef(card.id);
  if (def.kind === 'charm') value += 0.12; // charms are dead weight once the turn passes
  return value;
}

export function chooseMove(match, side) {
  let best = null;
  for (const move of candidateMoves(match, side)) {
    const value = scoreMove(match, side, move);
    if (best === null || value > best.value) best = { ...move, value };
  }
  if (!best || best.value < PLAY_THRESHOLD) return null;
  return best;
}

// One whole turn for the Warden: play while a move is worth making, then strike.
export function planTurn(match, side) {
  const plan = [];
  const working = cloneMatch(match);
  for (let step = 0; step < 8; step += 1) {
    const move = chooseMove(working, side);
    if (!move) break;
    const card = working[side].hand.find((held) => held.uid === move.uid);
    if (!card) break;
    playCard(working, side, move.uid, move.target);
    plan.push({ uid: card.uid, id: card.id, target: move.target });
    if (working.over) break;
  }
  return plan;
}
