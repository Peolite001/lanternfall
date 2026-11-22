// The three screens around the table: the title, the briefing (rules and how to play) and
// the result that lands when a Flame gutters out.

import { sfx } from './audio.js';
import { STARTING_FLAME } from './rules.js';

const RESULT_COPY = {
  win: {
    kicker: 'Your lantern holds',
    title: 'The Warden\u2019s Flame gutters out',
    body: 'Three beacons kept, a tide read, a warden outlasted. The pier is yours until the next storm.',
    tone: 'win',
  },
  loss: {
    kicker: 'Your lantern fails',
    title: 'The Warden holds the pier',
    body: 'Your Flame is out. The tide took the beacons you left open \u2014 watch the Spring Tide and keep a Keeper in every lane.',
    tone: 'loss',
  },
};

export function showTitle(titleScreen, tableScreen) {
  titleScreen.classList.remove('hidden');
  tableScreen.classList.add('hidden');
}

export function showTable(titleScreen, tableScreen) {
  titleScreen.classList.add('hidden');
  tableScreen.classList.remove('hidden');
}

export function showResult(resultScreen, match) {
  const won = match.over.winner === 'player';
  const copy = won ? RESULT_COPY.win : RESULT_COPY.loss;
  const flames = `your Flame ${Math.max(0, match.player.flame)} \u00b7 the Warden\u2019s ${Math.max(0, match.warden.flame)}`;
  resultScreen.className = `screen result ${copy.tone}`;
  resultScreen.querySelector('.result-kicker').textContent = copy.kicker;
  resultScreen.querySelector('.result-title').textContent = copy.title;
  resultScreen.querySelector('.result-body').textContent = copy.body;
  resultScreen.querySelector('.result-line').textContent = `${flames} \u00b7 round ${match.round} \u00b7 ${match.player.played} cards played`;
  resultScreen.querySelector('.result-seal').dataset.tone = copy.tone;
  resultScreen.classList.remove('hidden');
  if (won) sfx.win();
  else sfx.lose();
}

export function hideResult(resultScreen) {
  resultScreen.classList.add('hidden');
}

export function flameSummary(side) {
  return `${Math.max(0, side.flame)}/${STARTING_FLAME}`;
}
