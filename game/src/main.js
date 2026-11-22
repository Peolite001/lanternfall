// The controller: title screen, the player's turn, the Warden's turn, and the little
// flourish that carries a card from the hand to its beacon. Keyboard and mouse both play.

import { cardDef } from './cards.js';
import { planTurn } from './ai.js';
import { sfx, setMuted, unlockAudio } from './audio.js';
import { buildTable, clearSelection, flyCard, floatText, pushLog, render, setSelection, shake, ui } from './render.js';
import { hideResult, showResult, showTable, showTitle } from './screens.js';
import { shotLog, shotMatch } from './shots.js';
import {
  charmTargets,
  createMatch,
  endTurn,
  handCard,
  isSpringTide,
  isValidPlay,
  needsTarget,
  playCard,
  roundsUntilSpring,
} from './rules.js';

const screens = {
  title: document.querySelector('#title-screen'),
  table: document.querySelector('#table-screen'),
  result: document.querySelector('#result-screen'),
};

buildTable(screens.table);

let match = null;
let busy = false;
let focusBeacon = 0;
let lastHandKey = '';

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
if (params.has('still')) document.body.classList.add('no-motion');

boot();

function boot() {
  wireButtons();
  wireKeyboard();
  if (shot) {
    startShot(shot);
    return;
  }
  showTitle(screens.title, screens.table);
}

function wireButtons() {
  document.querySelector('#start-button').addEventListener('click', () => {
    unlockAudio();
    startMatch(createMatch({ seed: Date.now() % 100000 }));
  });
  document.querySelector('#begin-duel').addEventListener('click', () => {
    unlockAudio();
    startMatch(createMatch({ seed: (Date.now() % 100000) + 1 }));
  });
  document.querySelector('#how-to-play').addEventListener('click', () => {
    document.querySelector('#briefing').classList.toggle('hidden');
    sfx.select();
  });
  document.querySelector('#briefing-close').addEventListener('click', () => {
    document.querySelector('#briefing').classList.add('hidden');
  });
  document.querySelector('#how-to-play-table')?.addEventListener('click', () => {
    document.querySelector('#briefing').classList.toggle('hidden');
  });
  document.querySelector('#end-turn').addEventListener('click', endPlayerTurn);
  document.querySelector('#play-again').addEventListener('click', () => {
    hideResult(screens.result);
    startMatch(createMatch({ seed: (Date.now() % 100000) + 7 }));
  });
  document.querySelector('#result-title-button').addEventListener('click', () => {
    hideResult(screens.result);
    showTitle(screens.title, screens.table);
  });
  document.querySelector('#mute-button').addEventListener('click', toggleMute);

  ui.refs.hand.addEventListener('click', (event) => {
    const node = event.target.closest('.card');
    if (!node || busy || !match) return;
    const card = handCard(match, 'player', node.dataset.uid);
    if (!card) return;
    if (ui.selection && ui.selection.uid === card.uid) {
      clearSelection();
      return;
    }
    if (node.dataset.playable === '0') {
      pushLog(`Not enough Oil for ${cardDef(card.id).name}.`);
      return;
    }
    sfx.select();
    setSelection(match, card);
  });

  for (const slot of document.querySelectorAll('.slot')) {
    slot.addEventListener('click', () => {
      if (!match || busy || !ui.selection) return;
      const owner = slot.dataset.owner;
      const beacon = Number(slot.dataset.beacon);
      tryPlay(ui.selection.uid, { owner, beacon });
    });
  }
}

function wireKeyboard() {
  window.addEventListener('keydown', (event) => {
    if (!match || busy) {
      if (event.key === 'r' && match?.over) document.querySelector('#play-again').click();
      return;
    }
    if (event.key >= '1' && event.key <= '8') {
      const index = Number(event.key) - 1;
      const card = match.player.hand[index];
      if (card) {
        sfx.select();
        setSelection(match, card);
        focusBeacon = 0;
        highlightFocus();
      }
      return;
    }
    if (event.key === 'ArrowLeft' || event.key === 'a') {
      focusBeacon = (focusBeacon + 2) % 3;
      highlightFocus();
      return;
    }
    if (event.key === 'ArrowRight' || event.key === 'd') {
      focusBeacon = (focusBeacon + 1) % 3;
      highlightFocus();
      return;
    }
    if (event.key === 'Escape') {
      clearSelection();
      return;
    }
    if (event.key === 'Enter') {
      if (ui.selection) {
        const def = ui.selection.def;
        tryPlay(ui.selection.uid, keyboardTarget(def, focusBeacon));
      } else {
        endPlayerTurn();
      }
      return;
    }
    if (event.key === ' ') {
      event.preventDefault();
      if (ui.selection) {
        const def = ui.selection.def;
        tryPlay(ui.selection.uid, keyboardTarget(def, focusBeacon));
      } else {
        endPlayerTurn();
      }
    }
  });
}

// The keyboard aims at one beacon at a time; the target in it depends on the charm.
function keyboardTarget(def, beacon) {
  if (def.kind === 'keeper') return { owner: 'player', beacon };
  if (!needsTarget(def)) return null;
  const options = charmTargets(match, 'player', def).filter((place) => place.beacon === beacon);
  if (!options.length) return null;
  if (def.charm.kind === 'bounce') return options.find((place) => place.owner === 'warden') ?? options[0];
  return options.find((place) => place.owner === 'player') ?? options[0];
}

function highlightFocus() {
  for (const node of document.querySelectorAll('.beacon')) node.classList.remove('focused');
  ui.beacons[focusBeacon]?.column.classList.add('focused');
}

function startMatch(next) {
  match = next;
  focusBeacon = 0;
  lastHandKey = '';
  clearSelection();
  hideResult(screens.result);
  showTable(screens.title, screens.table);
  ui.refs.log.innerHTML = '';
  ui.deal = true;
  render(match);
  pushLog(`You hold the west lantern. ${greeting()}`);
  sfx.tide();
}

function greeting() {
  const spring = isSpringTide(match) ? 'Spring Tide now.' : `Spring Tide in ${roundsUntilSpring(match)} rounds.`;
  return `Three beacons, one Flame each. ${spring}`;
}

function startShot(kind) {
  match = shotMatch(kind);
  if (kind === 'title') {
    showTitle(screens.title, screens.table);
    return;
  }
  showTable(screens.title, screens.table);
  render(match);
  ui.refs.log.innerHTML = '';
  for (const line of shotLog(kind).slice().reverse()) pushLog(line);
  document.querySelector('#briefing').classList.add('hidden');
  if (kind === 'win' || kind === 'loss') {
    showResult(screens.result, match);
  }
}

async function tryPlay(uid, target) {
  const card = handCard(match, 'player', uid);
  if (!card) return;
  const def = cardDef(card.id);
  if (!isValidPlay(match, 'player', card, target)) {
    if (def.kind === 'keeper') pushLog('That beacon already holds a Keeper.');
    else pushLog('That is not a legal target for this charm.');
    shake(ui.beacons[focusBeacon]?.column);
    return;
  }
  busy = true;
  clearSelection();
  const fromNode = ui.refs.hand.querySelector(`[data-uid="${uid}"]`);
  const slot = target ? ui.beacons[target.beacon] : null;
  const toNode = slot ? (target.owner === 'player' ? slot.playerSlot : slot.wardenSlot) : null;
  const animation = flyCard(fromNode, toNode, def);
  const events = playCard(match, 'player', uid, target);
  await animation;
  applyEvents(events);
  checkOver();
  busy = false;
}

function applyEvents(events) {
  ui.deal = false;
  render(match);
  let beat = 0;
  for (const event of events) {
    const delay = beat * 150;
    beat += 1;
    window.setTimeout(() => animateEvent(event), delay);
  }
}

function animateEvent(event) {
  const beacon = event.beacon !== undefined ? ui.beacons[event.beacon] : null;
  switch (event.type) {
    case 'play': {
      const def = cardDef(event.card);
      const mine = event.side === 'player';
      sfx.play(def.tide);
      if (beacon && event.beacon >= 0) beacon.column.classList.add('landed');
      if (def.kind === 'keeper') {
        pushLog(`${mine ? 'You set a' : 'The Warden sets a'} ${def.name} at beacon ${event.beacon + 1}.`);
      } else {
        pushLog(`${mine ? 'You play' : 'The Warden plays'} ${def.name}.`);
      }
      break;
    }
    case 'strike': {
      const mine = event.side === 'player';
      sfx.strike();
      if (beacon) {
        shake(mine ? beacon.playerSlot : beacon.wardenSlot);
        floatText(mine ? beacon.playerSlot : beacon.wardenSlot, `-${event.amount}`, 'damage');
        beacon.seam.classList.add(event.onFlame ? 'hit-flame' : 'hit-keeper');
        window.setTimeout(() => beacon.seam.classList.remove('hit-flame', 'hit-keeper'), 400);
      }
      if (event.onFlame) {
        const rail = mine ? ui.refs.warden : ui.refs.player;
        sfx.hurt();
        shake(rail.flame.closest('.rail'));
        floatText(rail.flame, `-${event.amount}`, 'flame');
      }
      pushLog(
        `${mine ? 'Your' : 'The Warden\u2019s'} Keeper strikes beacon ${event.beacon + 1} for ${event.amount}${
          event.onFlame ? ' at the Flame' : ''
        }.`,
      );
      break;
    }
    case 'death':
      sfx.death();
      if (beacon) floatText(event.side === 'player' ? beacon.playerSlot : beacon.wardenSlot, 'fallen', 'death');
      pushLog(`A Keeper falls at beacon ${event.beacon + 1}.`);
      break;
    case 'heal': {
      sfx.heal();
      const rail = event.side === 'player' ? ui.refs.player : ui.refs.warden;
      floatText(rail.flame, `+${event.amount}`, 'heal');
      if (event.side === 'player') pushLog(`Your Flame rises by ${event.amount}.`);
      break;
    }
    case 'burn': {
      sfx.hurt();
      const rail = event.side === 'player' ? ui.refs.player : ui.refs.warden;
      floatText(rail.flame, `-${event.amount}`, 'flame');
      shake(rail.flame.closest('.rail'));
      break;
    }
    case 'gutter': {
      const rail = event.side === 'player' ? ui.refs.player : ui.refs.warden;
      floatText(rail.flame, `-${event.amount}`, 'flame');
      pushLog('No cards left: the Flame gutters for 3.');
      break;
    }
    case 'scorch':
      if (beacon) floatText(beacon.wardenSlot, `-${event.amount}`, 'damage');
      break;
    case 'bounce':
      if (beacon) floatText(event.side === 'player' ? beacon.playerSlot : beacon.wardenSlot, 'lifted', 'bounce');
      pushLog('A Squall lifts a Keeper off the pier.');
      break;
    case 'grow':
      if (beacon) floatText(event.side === 'player' ? beacon.playerSlot : beacon.wardenSlot, `+${event.amount}`, 'heal');
      break;
    case 'rally':
      break;
    case 'round':
      if (isSpringTide(match)) {
        sfx.tide();
        banner('Spring Tide \u2014 Keepers strike twice');
        pushLog('Spring Tide: every Keeper strikes twice this round.');
      }
      break;
    case 'over':
      break;
    default:
      break;
  }
}

function banner(text) {
  ui.refs.banner.textContent = text;
  ui.refs.banner.className = 'banner show';
  window.setTimeout(() => {
    ui.refs.banner.className = 'banner';
  }, 1800);
}

async function endPlayerTurn() {
  if (busy || !match || match.over || match.active !== 'player') return;
  busy = true;
  clearSelection();
  const events = endTurn(match, 'player');
  applyEvents(events);
  await wait(120 + events.length * 150);
  if (checkOver()) {
    busy = false;
    return;
  }
  await wardenTurn();
  busy = false;
}

async function wardenTurn() {
  const plan = planTurn(match, 'warden');
  for (const step of plan) {
    if (match.over) break;
    const card = handCard(match, 'warden', step.uid);
    if (!card || !isValidPlay(match, 'warden', card, step.target)) continue;
    const def = cardDef(card.id);
    const slot = step.target ? ui.beacons[step.target.beacon] : null;
    const toNode = slot ? (step.target.owner === 'player' ? slot.playerSlot : slot.wardenSlot) : null;
    const ghostFrom = slot ? (step.target.owner === 'player' ? slot.playerSlot : slot.wardenSlot) : null;
    flyCard(null, toNode, def);
    void def;
    const events = playCard(match, 'warden', step.uid, step.target);
    applyEvents(events);
    if (ghostFrom) ghostFrom.classList.add('played-flash');
    await wait(520);
    if (checkOver()) return;
  }
  await wait(180);
  const events = endTurn(match, 'warden');
  applyEvents(events);
  await wait(140 + events.length * 150);
  checkOver();
  if (!match.over) pushLog('Your turn.');
}

function checkOver() {
  if (!match.over) return false;
  const over = match.over;
  window.setTimeout(() => showResult(screens.result, match), 600);
  pushLog(over.winner === 'player' ? 'The Warden\u2019s Flame gutters out.' : 'Your Flame gutters out.');
  return true;
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function toggleMute() {
  const next = !document.querySelector('#mute-button').classList.contains('muted');
  setMuted(next);
  document.querySelector('#mute-button').classList.toggle('muted', next);
  document.querySelector('#mute-button').textContent = next ? 'sound off' : 'sound on';
  if (!next) sfx.select();
}
