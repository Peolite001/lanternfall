// Scripted positions for the screenshots: a fixed seed and a hand-written board, so the
// shots are real renders of this game's own code in a known, well-lit position.

import { cardDef } from './cards.js';
import { createMatch, resetUids } from './rules.js';

function keeper(id, power, ward, tide) {
  const def = cardDef(id);
  return {
    uid: `k${id}${power}${ward}`,
    id,
    name: def.name,
    tide,
    power,
    ward,
    bonusPower: 0,
  };
}

function hand(ids) {
  return ids.map((id) => ({ uid: `h${id}`, id }));
}

function baseTable() {
  resetUids(100);
  const match = createMatch({ seed: 7 });
  match.beacons = ['ember', 'moss', 'salt'];
  match.round = 5;
  match.active = 'player';
  match.over = null;
  match.player.flame = 22;
  match.player.maxOil = 6;
  match.player.oil = 5;
  match.player.deck = ['flare', 'flare', 'squall', 'bramble', 'mosswarden', 'rootbound', 'galewisp', 'saltbinder', 'cinderling'];
  match.player.hand = hand(['emberwright', 'squall', 'brinewisp', 'bramble', 'rootbound']);
  match.player.played = 7;
  match.player.beacons = [
    keeper('galewisp', 3, 2, 'gale'),
    keeper('mosswarden', 2, 3, 'moss'),
    keeper('emberwright', 3, 3, 'ember'),
  ];
  match.warden.flame = 12;
  match.warden.maxOil = 6;
  match.warden.oil = 2;
  match.warden.deck = ['tidewarden', 'cinderling', 'flare', 'brinewisp'];
  match.warden.hand = hand(['cinderling', 'mosswarden', 'flare']);
  match.warden.beacons = [
    keeper('cinderling', 3, 1, 'ember'),
    null,
    keeper('tidewarden', 2, 4, 'salt'),
  ];
  return match;
}

export function shotMatch(kind) {
  if (kind === 'win') {
    const match = baseTable();
    match.round = 7;
    match.player.flame = 16;
    match.warden.flame = 0;
    match.player.played = 14;
    match.player.hand = hand(['bramble']);
    match.over = { winner: 'player', reason: 'flame' };
    return match;
  }
  if (kind === 'loss') {
    const match = baseTable();
    match.round = 8;
    match.player.flame = 0;
    match.warden.flame = 19;
    match.player.played = 12;
    match.player.beacons = [null, keeper('mosswarden', 2, 2, 'moss'), null];
    match.player.hand = hand(['cinderling']);
    match.over = { winner: 'warden', reason: 'flame' };
    return match;
  }
  return baseTable();
}

export function shotLog(kind) {
  if (kind === 'win') return ['Emberwright strikes the Warden\u2019s Flame for 4', 'The Warden\u2019s Flame gutters out'];
  if (kind === 'loss') return ['The Warden strikes your open beacon for 3', 'Your Flame gutters out'];
  return [
    'Spring Tide next round \u2014 every Keeper strikes twice',
    'Your Emberwright scorched a Tidewarden for 2',
    'The Warden plays a Cinderling at the Ember beacon',
    'You heal 2 Flame from a Brinewisp',
  ];
}
