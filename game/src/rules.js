// The rules of Lanternfall, with no rendering and no DOM: a duel is two duelists, three
// beacons, Oil that grows each turn, and a Spring Tide every third round that strikes twice.
// Every function returns the events it caused so the table can animate them.

import { buildDeck, cardDef, TIDE_ORDER } from './cards.js';
import { makeRng, shuffle } from './random.js';

export const STARTING_FLAME = 30;
export const OPENING_HAND = 4;
export const MAX_OIL = 10;
export const HAND_LIMIT = 8;
export const SPRING_EVERY = 3;
export const GUTTER_DAMAGE = 3;
export const BEACONS = 3;

let nextUid = 1;

export function resetUids(value = 1) {
  nextUid = value;
}

function makeSide(name, deck, rng) {
  return {
    name,
    flame: STARTING_FLAME,
    oil: 0,
    maxOil: 0,
    deck: shuffle(deck, rng),
    hand: [],
    beacons: [null, null, null],
    played: 0,
    turns: 0,
  };
}

export function createMatch(options = {}) {
  const seed = options.seed ?? 1;
  const rng = makeRng(seed);
  const deck = options.deck ?? buildDeck();
  const match = {
    rng,
    seed,
    round: 1,
    active: 'player',
    beacons: [0, 1, 2].map(() => TIDE_ORDER[Math.floor(rng() * TIDE_ORDER.length)]),
    player: makeSide('you', deck, rng),
    warden: makeSide('warden', deck, rng),
    over: null,
    log: [],
  };
  dealOpeningHands(match);
  beginTurn(match, 'player');
  return match;
}

export function cloneMatch(match) {
  return {
    ...match,
    beacons: match.beacons.slice(),
    player: cloneSide(match.player),
    warden: cloneSide(match.warden),
    over: match.over ? { ...match.over } : null,
    log: match.log.slice(),
  };
}

function cloneSide(side) {
  return {
    ...side,
    deck: side.deck.slice(),
    hand: side.hand.slice(),
    beacons: side.beacons.map((keeper) => (keeper ? { ...keeper } : null)),
  };
}

export function other(sideId) {
  return sideId === 'player' ? 'warden' : 'player';
}

export function isSpringTide(match) {
  return match.round % SPRING_EVERY === 0;
}

export function roundsUntilSpring(match) {
  const remainder = match.round % SPRING_EVERY;
  return remainder === 0 ? 0 : SPRING_EVERY - remainder;
}

export function dealOpeningHands(match) {
  drawCards(match, 'player', OPENING_HAND, []);
  drawCards(match, 'warden', OPENING_HAND, []);
}

export function beginTurn(match, sideId) {
  const side = match[sideId];
  side.maxOil = Math.min(MAX_OIL, side.maxOil + 1);
  side.oil = side.maxOil;
  side.turns += 1;
  const events = [];
  drawCards(match, sideId, 1, events);
  return events;
}

export function drawCards(match, sideId, count, events) {
  const side = match[sideId];
  for (let i = 0; i < count; i++) {
    if (side.deck.length === 0) {
      side.flame -= GUTTER_DAMAGE;
      events.push({ type: 'gutter', side: sideId, amount: GUTTER_DAMAGE });
      checkFlame(match, events);
      continue;
    }
    const id = side.deck.shift();
    if (side.hand.length >= HAND_LIMIT) {
      events.push({ type: 'burned', side: sideId, card: id });
      continue;
    }
    const card = { uid: `c${nextUid++}`, id };
    side.hand.push(card);
    events.push({ type: 'draw', side: sideId, uid: card.uid, card: id });
  }
  return events;
}

export function keeperPower(match, keeper, beaconIndex) {
  if (!keeper) return 0;
  const attuned = keeper.tide === match.beacons[beaconIndex] ? 1 : 0;
  return keeper.power + keeper.bonusPower + attuned;
}

export function keeperAt(match, sideId, beaconIndex) {
  return match[sideId].beacons[beaconIndex];
}

export function emptyBeacon(match, sideId, beaconIndex) {
  return match[sideId].beacons[beaconIndex] === null;
}

export function handCard(match, sideId, uid) {
  return match[sideId].hand.find((card) => card.uid === uid) ?? null;
}

export function isAffordable(match, sideId, card) {
  const def = cardDef(card.id);
  return def.cost <= match[sideId].oil;
}

// What a charm may be pointed at: null for a charm that needs no target, else the list of
// places it can land. The table reads this to light up the legal targets.
export function charmTargets(match, sideId, def) {
  if (def.kind !== 'charm') return [];
  const places = [];
  if (def.charm.kind === 'bounce' || def.charm.kind === 'growWard') {
    for (const owner of ['player', 'warden']) {
      for (let i = 0; i < BEACONS; i++) {
        if (match[owner].beacons[i]) places.push({ owner, beacon: i });
      }
    }
  }
  return places;
}

export function needsTarget(def) {
  return def.kind === 'charm' && def.target !== 'none';
}

export function isValidPlay(match, sideId, card, target) {
  if (match.over) return false;
  if (match.active !== sideId) return false;
  const def = cardDef(card.id);
  if (!isAffordable(match, sideId, card)) return false;
  if (def.kind === 'keeper') {
    if (!target || target.owner !== sideId) return false;
    return Number.isInteger(target.beacon) && emptyBeacon(match, sideId, target.beacon);
  }
  if (!needsTarget(def)) return true;
  if (!target) return false;
  return charmTargets(match, sideId, def).some(
    (place) => place.owner === target.owner && place.beacon === target.beacon,
  );
}

function damageKeeper(match, owner, beaconIndex, amount, events) {
  const keeper = match[owner].beacons[beaconIndex];
  if (!keeper) return;
  keeper.ward -= amount;
  if (keeper.ward <= 0) {
    match[owner].beacons[beaconIndex] = null;
    events.push({ type: 'death', side: owner, beacon: beaconIndex });
  }
}

export function playCard(match, sideId, uid, target) {
  const events = [];
  const side = match[sideId];
  const card = handCard(match, sideId, uid);
  if (!card || !isValidPlay(match, sideId, card, target)) return events;
  const def = cardDef(card.id);

  side.hand = side.hand.filter((held) => held.uid !== uid);
  side.oil -= def.cost;
  side.played += 1;

  if (def.kind === 'keeper') {
    const keeper = {
      uid: card.uid,
      id: def.id,
      name: def.name,
      tide: def.tide,
      power: def.power,
      ward: def.ward,
      bonusPower: 0,
    };
    side.beacons[target.beacon] = keeper;
    events.push({ type: 'play', side: sideId, card: def.id, beacon: target.beacon, uid: card.uid });
    applyKeeperArrival(match, sideId, target.beacon, def, events);
  } else {
    events.push({ type: 'play', side: sideId, card: def.id, beacon: target ? target.beacon : -1, uid: card.uid });
    applyCharm(match, sideId, def, target, events);
  }
  checkFlame(match, events);
  return events;
}

function applyKeeperArrival(match, sideId, beaconIndex, def, events) {
  const effect = def.onPlay;
  if (!effect) return;
  if (effect.kind === 'heal') {
    match[sideId].flame += effect.amount;
    events.push({ type: 'heal', side: sideId, amount: effect.amount });
  } else if (effect.kind === 'scorchOpposing') {
    const victim = other(sideId);
    if (match[victim].beacons[beaconIndex]) {
      damageKeeper(match, victim, beaconIndex, effect.amount, events);
      events.push({ type: 'scorch', side: victim, beacon: beaconIndex, amount: effect.amount });
    }
  } else if (effect.kind === 'draw') {
    drawCards(match, sideId, effect.amount, events);
  } else if (effect.kind === 'rally') {
    const candidates = match[sideId].beacons.filter((keeper, index) => keeper && index !== beaconIndex);
    if (candidates.length) {
      const best = candidates.reduce((lead, keeper) =>
        keeperPower(match, keeper, beaconIndex) > keeperPower(match, lead, beaconIndex) ? keeper : lead,
      );
      best.power += effect.power;
      best.ward += effect.ward;
      events.push({ type: 'rally', side: sideId, uid: best.uid });
      if (best.ward <= 0) {
        const index = match[sideId].beacons.indexOf(best);
        match[sideId].beacons[index] = null;
        events.push({ type: 'death', side: sideId, beacon: index });
      }
    }
  }
}

function applyCharm(match, sideId, def, target, events) {
  const effect = def.charm;
  if (effect.kind === 'burnFlame') {
    const victim = other(sideId);
    match[victim].flame -= effect.amount;
    events.push({ type: 'burn', side: victim, amount: effect.amount });
  } else if (effect.kind === 'bounce') {
    const keeper = match[target.owner].beacons[target.beacon];
    if (keeper) {
      match[target.owner].beacons[target.beacon] = null;
      const owner = match[target.owner];
      if (owner.hand.length < HAND_LIMIT) {
        owner.hand.push({ uid: `c${nextUid++}`, id: keeper.id });
      }
      events.push({ type: 'bounce', side: target.owner, beacon: target.beacon, card: keeper.id });
    }
  } else if (effect.kind === 'growWard') {
    const keeper = match[target.owner].beacons[target.beacon];
    if (keeper) {
      keeper.ward += effect.amount;
      events.push({ type: 'grow', side: target.owner, beacon: target.beacon, amount: effect.amount });
    }
  }
}

export function endTurn(match, sideId) {
  const events = [];
  if (match.over || match.active !== sideId) return events;
  strikePhase(match, sideId, events);
  if (match.over) return events;
  if (sideId === 'player') {
    match.active = 'warden';
    events.push(...beginTurn(match, 'warden'));
  } else {
    match.round += 1;
    match.active = 'player';
    events.push({ type: 'round', round: match.round });
    events.push(...beginTurn(match, 'player'));
  }
  return events;
}

function strikePhase(match, sideId, events) {
  const victimId = other(sideId);
  const strikes = isSpringTide(match) ? 2 : 1;
  for (let pass = 0; pass < strikes; pass += 1) {
    for (let i = 0; i < BEACONS; i += 1) {
      const attacker = match[sideId].beacons[i];
      if (!attacker) continue;
      const amount = keeperPower(match, attacker, i);
      if (match[victimId].beacons[i]) {
        events.push({ type: 'strike', side: sideId, beacon: i, amount, onFlame: false });
        damageKeeper(match, victimId, i, amount, events);
      } else {
        match[victimId].flame -= amount;
        events.push({ type: 'strike', side: sideId, beacon: i, amount, onFlame: true });
      }
      if (match[victimId].flame <= 0) {
        finish(match, sideId, 'flame');
        return;
      }
    }
  }
}

export function checkFlame(match, events) {
  if (match.over) return;
  if (match.warden.flame <= 0) finish(match, 'player', 'flame');
  else if (match.player.flame <= 0) finish(match, 'warden', 'flame');
  if (match.over && events) events.push({ type: 'over', winner: match.over.winner });
}

function finish(match, winner, reason) {
  match.over = { winner, reason };
}

export function flamePercent(side) {
  return Math.max(0, Math.min(100, (side.flame / STARTING_FLAME) * 100));
}
