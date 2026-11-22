// The table: builds the three beacons once, then redraws the rails, the board and the hand
// from the match. Every animation the game plays (a card flying to its beacon, a struck
// Keeper, a flame that falls) is started from here.

import { TIDES, cardDef } from './cards.js';
import {
  STARTING_FLAME,
  charmTargets,
  isSpringTide,
  keeperPower,
  needsTarget,
  roundsUntilSpring,
} from './rules.js';

const SVG = 'http://www.w3.org/2000/svg';

export const ui = {
  root: null,
  beacons: [],
  refs: {},
  selection: null,
  busy: false,
};

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function tideGlyph(tide, className = 'tide-glyph') {
  const spec = TIDES[tide];
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('class', className);
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(SVG, 'path');
  path.setAttribute('d', spec.glyph);
  svg.appendChild(path);
  return svg;
}

export function buildTable(root) {
  ui.root = root;
  ui.refs.beacons = root.querySelector('#beacons');
  ui.refs.hand = root.querySelector('#hand');
  ui.refs.round = root.querySelector('#round-label');
  ui.refs.tide = root.querySelector('#tide-call');
  ui.refs.log = root.querySelector('#table-log');
  ui.refs.endTurn = root.querySelector('#end-turn');
  ui.refs.warden = {
    flame: root.querySelector('#warden-flame'),
    bar: root.querySelector('#warden-bar-fill'),
    oil: root.querySelector('#warden-oil'),
    deck: root.querySelector('#warden-deck'),
    hand: root.querySelector('#warden-hand-count'),
  };
  ui.refs.player = {
    flame: root.querySelector('#player-flame'),
    bar: root.querySelector('#player-bar-fill'),
    oil: root.querySelector('#player-oil'),
    deck: root.querySelector('#player-deck'),
    hand: root.querySelector('#player-hand-count'),
  };
  ui.refs.floats = root.querySelector('#floats');
  ui.refs.banner = root.querySelector('#banner');
  ui.beacons = [];
  for (let index = 0; index < 3; index += 1) {
    const column = el('div', 'beacon');
    column.dataset.beacon = String(index);
    const head = el('div', 'beacon-head');
    const badge = el('span', 'beacon-badge');
    const label = el('span', 'beacon-label', `Beacon ${index + 1}`);
    head.append(badge, label);
    const wardenSlot = el('div', 'slot slot-warden');
    wardenSlot.dataset.owner = 'warden';
    wardenSlot.dataset.beacon = String(index);
    const seam = el('div', 'beacon-seam');
    const playerSlot = el('div', 'slot slot-player');
    playerSlot.dataset.owner = 'player';
    playerSlot.dataset.beacon = String(index);
    column.append(head, wardenSlot, seam, playerSlot);
    ui.refs.beacons.appendChild(column);
    ui.beacons.push({ column, badge, wardenSlot, playerSlot, seam });
  }
  return ui;
}

export function cardNode(def, options = {}) {
  const card = el('article', `card tide-${def.tide} ${def.kind}`);
  if (options.uid) card.dataset.uid = options.uid;
  if (options.index !== undefined) card.dataset.index = String(options.index);
  card.dataset.card = def.id;

  const cost = el('div', 'card-cost');
  cost.append(el('span', 'cost-value', String(def.cost)));
  cost.append(el('span', 'cost-label', 'oil'));

  const art = el('div', 'card-art');
  art.append(tideGlyph(def.tide));
  const halo = el('span', 'art-halo');
  art.append(halo);

  const name = el('h3', 'card-name', def.name);
  const text = el('p', 'card-text', def.text);
  card.append(cost, art, name, text);

  if (def.kind === 'keeper') {
    const stats = el('div', 'card-stats');
    const power = el('span', 'stat stat-power');
    power.append(el('span', 'stat-value', String(def.power)), el('span', 'stat-label', 'Pwr'));
    const ward = el('span', 'stat stat-ward');
    ward.append(el('span', 'stat-value', String(def.ward)), el('span', 'stat-label', 'Wrd'));
    stats.append(power, ward);
    card.append(stats);
  } else {
    const seal = el('div', 'card-seal');
    seal.append(tideGlyph(def.tide, 'seal-glyph'), el('span', 'seal-label', 'Charm'));
    card.append(seal);
  }

  const mark = el('span', 'card-tide-mark');
  mark.append(tideGlyph(def.tide, 'mark-glyph'));
  card.append(mark);
  if (options.attuned) card.classList.add('attuned');
  return card;
}

function keeperNode(keeper, match, beaconIndex, owner) {
  const def = cardDef(keeper.id);
  const node = cardNode(def, { uid: keeper.uid, attuned: keeper.tide === match.beacons[beaconIndex] });
  node.classList.add('on-board');
  const power = node.querySelector('.stat-power .stat-value');
  const ward = node.querySelector('.stat-ward .stat-value');
  const live = keeperPower(match, keeper, beaconIndex);
  if (power) power.textContent = String(live);
  if (ward) ward.textContent = String(keeper.ward);
  if (live > keeper.power) power?.classList.add('boosted');
  if (keeper.ward > def.ward) ward?.classList.add('boosted');
  node.dataset.owner = owner;
  node.dataset.beacon = String(beaconIndex);
  return node;
}

function paintOil(container, side) {
  container.innerHTML = '';
  for (let i = 1; i <= side.maxOil; i += 1) {
    const pip = el('span', i <= side.oil ? 'pip lit' : 'pip');
    container.appendChild(pip);
  }
  if (side.maxOil === 0) container.appendChild(el('span', 'pip'));
}

export function render(match) {
  renderRails(match);
  renderBeacons(match);
  renderHand(match);
  renderStatus(match);
}

function renderRails(match) {
  for (const sideId of ['warden', 'player']) {
    const side = match[sideId];
    const refs = ui.refs[sideId];
    refs.flame.textContent = String(Math.max(0, side.flame));
    refs.flame.classList.toggle('low', side.flame <= 6);
    refs.bar.style.width = `${Math.max(0, Math.min(100, (side.flame / STARTING_FLAME) * 100))}%`;
    paintOil(refs.oil, side);
    refs.deck.textContent = String(side.deck.length);
    refs.hand.textContent = String(side.hand.length);
  }
}

function renderBeacons(match) {
  ui.beacons.forEach((beacon, index) => {
    const tide = match.beacons[index];
    beacon.column.dataset.tide = tide;
    beacon.badge.innerHTML = '';
    beacon.badge.append(tideGlyph(tide, 'beacon-glyph'));
    beacon.badge.append(el('span', 'beacon-tide-name', TIDES[tide].name));
    const wardenKeeper = match.warden.beacons[index];
    const playerKeeper = match.player.beacons[index];
    beacon.wardenSlot.innerHTML = '';
    beacon.playerSlot.innerHTML = '';
    if (wardenKeeper) beacon.wardenSlot.appendChild(keeperNode(wardenKeeper, match, index, 'warden'));
    else beacon.wardenSlot.appendChild(el('div', 'slot-empty', 'open'));
    if (playerKeeper) beacon.playerSlot.appendChild(keeperNode(playerKeeper, match, index, 'player'));
    else beacon.playerSlot.appendChild(el('div', 'slot-empty', 'open'));
    beacon.column.classList.toggle('attuned-warden', Boolean(wardenKeeper && wardenKeeper.tide === tide));
    beacon.column.classList.toggle('attuned-player', Boolean(playerKeeper && playerKeeper.tide === tide));
  });
}

function renderHand(match) {
  const hand = ui.refs.hand;
  const key = match.player.hand.map((card) => card.uid).join(',');
  hand.classList.toggle('still', key === ui.lastHandKey);
  ui.lastHandKey = key;
  hand.innerHTML = '';
  match.player.hand.forEach((card, index) => {
    const def = cardDef(card.id);
    const node = cardNode(def, { uid: card.uid, index });
    node.classList.add('in-hand');
    node.style.setProperty('--hand-index', String(index));
    node.style.setProperty('--hand-count', String(match.player.hand.length));
    const affordable = def.cost <= match.player.oil && match.active === 'player' && !match.over;
    node.classList.toggle('unaffordable', !affordable);
    node.dataset.playable = affordable ? '1' : '0';
    hand.appendChild(node);
  });
  if (!match.player.hand.length) hand.appendChild(el('p', 'empty-hand', 'Your hand is empty.'));
}

function renderStatus(match) {
  ui.refs.round.textContent = `Round ${match.round}`;
  const spring = isSpringTide(match);
  const until = roundsUntilSpring(match);
  if (spring) ui.refs.tide.textContent = 'Spring Tide \u2014 every Keeper strikes twice';
  else ui.refs.tide.textContent = until === 1 ? 'Spring Tide next round' : `Spring Tide in ${until} rounds`;
  ui.refs.tide.classList.toggle('now', spring);
  const myTurn = match.active === 'player' && !match.over;
  ui.refs.endTurn.disabled = !myTurn;
  ui.refs.endTurn.classList.toggle('waiting', match.active !== 'player' && !match.over);
}

export function setSelection(match, card) {
  ui.selection = null;
  for (const node of document.querySelectorAll('.card')) node.classList.remove('selected', 'target');
  if (!card) return;
  ui.selection = { uid: card.uid, def: cardDef(card.id) };
  const handCardNode = ui.refs.hand.querySelector(`[data-uid="${card.uid}"]`);
  handCardNode?.classList.add('selected');
  if (needsTarget(ui.selection.def)) {
    for (const place of charmTargets(match, 'player', ui.selection.def)) {
      const slot = ui.beacons[place.beacon];
      const node = place.owner === 'player' ? slot.playerSlot : slot.wardenSlot;
      node.classList.add('target');
      node.querySelector('.card')?.classList.add('target');
    }
  } else if (ui.selection.def.kind === 'keeper') {
    for (let index = 0; index < 3; index += 1) {
      if (!match.player.beacons[index]) ui.beacons[index].playerSlot.classList.add('target');
    }
  }
}

export function clearSelection() {
  ui.selection = null;
  for (const node of document.querySelectorAll('.card, .slot')) node.classList.remove('selected', 'target');
}

export function floatText(anchor, text, kind = 'damage') {
  if (!anchor) return;
  const box = anchor.getBoundingClientRect();
  const floater = el('div', `floater ${kind}`, text);
  floater.style.left = `${box.left + box.width / 2}px`;
  floater.style.top = `${box.top + box.height / 2}px`;
  ui.refs.floats.appendChild(floater);
  window.setTimeout(() => floater.remove(), 1200);
}

export function shake(node) {
  if (!node) return;
  node.classList.remove('shaking');
  void node.offsetWidth;
  node.classList.add('shaking');
  window.setTimeout(() => node.classList.remove('shaking'), 500);
}

export function flyCard(fromNode, toNode, def) {
  if (!fromNode || !toNode) return Promise.resolve();
  const from = fromNode.getBoundingClientRect();
  const to = toNode.getBoundingClientRect();
  const ghost = cardNode(def);
  ghost.classList.add('flying');
  ghost.style.width = `${from.width}px`;
  ghost.style.height = `${from.height}px`;
  ghost.style.left = `${from.left}px`;
  ghost.style.top = `${from.top}px`;
  document.body.appendChild(ghost);
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      ghost.style.transform =
        `translate(${to.left + to.width / 2 - (from.left + from.width / 2)}px,` +
        `${to.top + to.height / 2 - (from.top + from.height / 2)}px) rotate(0deg) scale(0.92)`;
      ghost.style.opacity = '0.15';
    });
    window.setTimeout(() => {
      ghost.remove();
      resolve();
    }, 260);
  });
}

export function banner(text, tone = '') {
  const node = ui.refs.banner;
  node.textContent = text;
  node.className = `banner show ${tone}`;
  window.setTimeout(() => {
    node.className = 'banner';
  }, 1600);
}

export function pushLog(text) {
  const line = el('li', 'log-line', text);
  ui.refs.log.prepend(line);
  while (ui.refs.log.children.length > 4) ui.refs.log.lastChild.remove();
}
