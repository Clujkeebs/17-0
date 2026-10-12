// Builds Sports Strands boards offline. Usage: npx tsx scripts/strands-build.ts <part> <of> <boardsPerPack> <secondsPerPack>
// Writes /tmp/strands-part-<part>.json; scripts/strands-merge.mjs turns the parts into src/lib/minigames/puzzles/strands-boards.ts.
import { writeFileSync } from 'node:fs';
import { createRng } from '../src/lib/game/prng';
import { PACKS } from '../src/lib/minigames/puzzles/strands-bank';
import { attemptBoard } from '../src/lib/minigames/puzzles/strands-gen';

const [part = '0', of = '1', per = '8', secs = '90'] = process.argv.slice(2);
const out: { theme: string; letters: string; words: [string, number[]][] }[] = [];
for (const [k, pack] of PACKS.entries()) {
  if (k % Number(of) !== Number(part)) continue;
  const t0 = Date.now();
  const seen = new Set<string>();
  let n = 0, tries = 0;
  while (n < Number(per) && Date.now() - t0 < Number(secs) * 1000) {
    tries++;
    const b = attemptBoard(pack, createRng(`strands:${pack.theme}:${tries}`));
    if (!b) continue;
    // One board per set of words, so a theme does not repeat itself.
    const key = b.words.map((w) => w.word).sort().join('|');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ theme: b.theme, letters: b.letters.join(''), words: b.words.map((w) => [w.word, w.cells]) });
    n++;
  }
  console.error(`${pack.theme}: ${n} boards in ${tries} tries (${Date.now() - t0} ms)`);
  writeFileSync(`/tmp/strands-part-${part}.json`, JSON.stringify(out));
}
writeFileSync(`/tmp/strands-part-${part}.json`, JSON.stringify(out));
