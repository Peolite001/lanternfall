// Lanternfall's hand-in program (Node 22, standard library only).
//
// The game itself is game/: plain static files a desktop browser opens with no network request.
// This program does the two things the grader asks for: it copies game/ and screenshots/ into the
// output directory, and it writes dossier.json there with the kit's buildDossier, so the judge
// reads a summary of the same files the gate checked.
//
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The scorer's own caps, as the kit's starter names them: only text_max_bytes shapes the dossier's
// bytes, the rest refuse an entry the scorer would refuse rather than let it be graded blind.
const GAME_LIMITS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

function copyInto(name) {
  const source = join(here, name);
  if (!existsSync(source)) throw new Error(`Lanternfall is missing its ${name}/ folder`);
  const target = join(outDir, name);
  rmSync(target, { recursive: true, force: true });
  cpSync(source, target, { recursive: true });
  return target;
}

function main() {
  mkdirSync(outDir, { recursive: true });
  copyInto('game');
  copyInto('screenshots');

  const dossier = buildDossier(outDir, GAME_LIMITS);
  writeFileSync(join(outDir, 'dossier.json'), dossier);
  console.log(`Lanternfall handed in to ${outDir} (dossier ${Buffer.byteLength(dossier)} bytes)`);
}

main();
