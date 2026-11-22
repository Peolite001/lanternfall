// The card pool of Lanternfall: four tides (suits), twelve designs, and the 24-card deck
// each duelist shuffles. Every value the table shows lives here, so balance is edited in one place.

export const TIDES = {
  salt: {
    key: 'salt',
    name: 'Salt',
    glyph: 'M2 15c3 0 3-4 6-4s3 4 6 4 3-4 6-4 3 4 6 4',
    color: '#3fa9d6',
    deep: '#123e57',
  },
  ember: {
    key: 'ember',
    name: 'Ember',
    glyph: 'M12 2c3 5 7 6 7 11a7 7 0 0 1-14 0c0-3 2-4 3-6 1 2 2 2 2 4 1-3 2-5 2-9z',
    color: '#f0743c',
    deep: '#5a2312',
  },
  gale: {
    key: 'gale',
    name: 'Gale',
    glyph: 'M3 8h11a3 3 0 1 0-3-3M3 13h15a3 3 0 1 1-3 3M3 18h7',
    color: '#59c9b4',
    deep: '#123f3a',
  },
  moss: {
    key: 'moss',
    name: 'Moss',
    glyph: 'M20 4c0 9-6 15-14 15 0-9 6-15 14-15zM4 20c2-6 5-9 9-11',
    color: '#8fc25b',
    deep: '#2b4018',
  },
};

export const TIDE_ORDER = ['salt', 'ember', 'gale', 'moss'];

// kind: 'keeper' sits in a beacon and strikes; 'charm' is a one-shot.
// onPlay: what a keeper does as it lands. charm: what a charm does to its target.
// target: 'keeper' (either side), 'enemyKeeper', 'friendlyKeeper', 'none'.
export const CARDS = {
  brinewisp: {
    id: 'brinewisp',
    name: 'Brinewisp',
    tide: 'salt',
    kind: 'keeper',
    cost: 1,
    power: 1,
    ward: 2,
    text: 'On play: restore 2 Flame.',
    onPlay: { kind: 'heal', amount: 2 },
  },
  tidewarden: {
    id: 'tidewarden',
    name: 'Tidewarden',
    tide: 'salt',
    kind: 'keeper',
    cost: 2,
    power: 2,
    ward: 3,
    text: 'A steady hand on the rail.',
  },
  saltbinder: {
    id: 'saltbinder',
    name: 'Saltbinder',
    tide: 'salt',
    kind: 'keeper',
    cost: 4,
    power: 3,
    ward: 6,
    text: 'On play: restore 3 Flame.',
    onPlay: { kind: 'heal', amount: 3 },
  },
  cinderling: {
    id: 'cinderling',
    name: 'Cinderling',
    tide: 'ember',
    kind: 'keeper',
    cost: 1,
    power: 2,
    ward: 1,
    text: 'Quick, and gone as quickly.',
  },
  emberwright: {
    id: 'emberwright',
    name: 'Emberwright',
    tide: 'ember',
    kind: 'keeper',
    cost: 3,
    power: 3,
    ward: 3,
    text: 'On play: scorch the Keeper opposing it for 2.',
    onPlay: { kind: 'scorchOpposing', amount: 2 },
  },
  galewisp: {
    id: 'galewisp',
    name: 'Galewisp',
    tide: 'gale',
    kind: 'keeper',
    cost: 2,
    power: 2,
    ward: 2,
    text: 'On play: draw a card.',
    onPlay: { kind: 'draw', amount: 1 },
  },
  windvane: {
    id: 'windvane',
    name: 'Windvane',
    tide: 'gale',
    kind: 'keeper',
    cost: 3,
    power: 3,
    ward: 3,
    text: 'On play: give another friendly Keeper +1 Power, +1 Ward.',
    onPlay: { kind: 'rally', power: 1, ward: 1 },
  },
  mosswarden: {
    id: 'mosswarden',
    name: 'Mosswarden',
    tide: 'moss',
    kind: 'keeper',
    cost: 2,
    power: 2,
    ward: 4,
    text: 'Roots deep in the pier.',
  },
  rootbound: {
    id: 'rootbound',
    name: 'Rootbound Colossus',
    tide: 'moss',
    kind: 'keeper',
    cost: 5,
    power: 6,
    ward: 6,
    text: 'Slow to wake. Awful when it does.',
  },
  flare: {
    id: 'flare',
    name: 'Flare',
    tide: 'ember',
    kind: 'charm',
    cost: 1,
    target: 'none',
    text: 'Deal 2 damage to the enemy Flame.',
    charm: { kind: 'burnFlame', amount: 2 },
  },
  squall: {
    id: 'squall',
    name: 'Squall',
    tide: 'gale',
    kind: 'charm',
    cost: 2,
    target: 'keeper',
    text: 'Lift a Keeper back into its owner\u2019s hand.',
    charm: { kind: 'bounce' },
  },
  bramble: {
    id: 'bramble',
    name: 'Bramble',
    tide: 'moss',
    kind: 'charm',
    cost: 1,
    target: 'keeper',
    text: 'Give a Keeper +3 Ward.',
    charm: { kind: 'growWard', amount: 3 },
  },
};

export const DECK_RECIPE = [
  'brinewisp',
  'brinewisp',
  'tidewarden',
  'tidewarden',
  'saltbinder',
  'saltbinder',
  'cinderling',
  'cinderling',
  'emberwright',
  'emberwright',
  'galewisp',
  'galewisp',
  'windvane',
  'windvane',
  'mosswarden',
  'mosswarden',
  'rootbound',
  'rootbound',
  'flare',
  'flare',
  'squall',
  'squall',
  'bramble',
  'bramble',
];

export function buildDeck() {
  return DECK_RECIPE.slice();
}

export function cardDef(id) {
  return CARDS[id];
}
