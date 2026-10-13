import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// The shop's art is generated (scripts/cosmetics). These checks catch what a generator slip would ship: CSS the browser
// throws away (so the art quietly does not move) and art that has lost its still twin.
const root = join(__dirname, '..', '..', 'public', 'cosmetics');
const files = readdirSync(root).flatMap((dir) => readdirSync(join(root, dir)).filter((f) => f.endsWith('.svg')).map((f) => ({ dir, f, svg: readFileSync(join(root, dir, f), 'utf8') })));
const cssOf = (svg: string) => [...svg.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('\n') + '\n' + [...svg.matchAll(/style="([^"]*)"/g)].map((m) => m[1]).join(';');
const REDUCE = '@media (prefers-reduced-motion: reduce)';

describe('cosmetic art', () => {
  it('has art on disk', () => { expect(files.length).toBeGreaterThan(150); });

  it('never writes a CSS transform the browser rejects: translate(), scale() and friends take commas between values', () => {
    const bad = files.filter(({ svg }) => /(translate|scale|skew)\(\s*-?[\d.]+(px|%|deg)?\s+-?[\d.]/.test(cssOf(svg)));
    expect(bad.map((b) => `${b.dir}/${b.f}`)).toEqual([]);
  });

  it('every moving piece of art animates in its own file and stands still in its .still.svg twin', () => {
    const animated = files.filter(({ f }) => !f.endsWith('.still.svg') && !f.includes('ring-'));
    expect(animated.length).toBeGreaterThan(80);
    for (const { dir, f, svg } of animated) {
      expect(svg, `${dir}/${f} must animate whatever the device asks`).not.toContain(REDUCE);
      const twin = files.find((x) => x.dir === dir && x.f === f.replace(/\.svg$/, '.still.svg'));
      expect(twin, `${dir}/${f} needs a still twin`).toBeDefined();
      expect(twin!.svg).toContain(REDUCE);
    }
  });

  it('the meteors actually travel: their keyframes parse and move the streak along a diagonal', () => {
    const svg = files.find((x) => x.f === 'fx-meteors.svg')!.svg;
    const m = /@keyframes mt\{0%\{transform:translate\(([-\d.]+)px, ([-\d.]+)px\);opacity:0\}[\s\S]*?100%\{transform:translate\(([-\d.]+)px, ([-\d.]+)px\)/.exec(svg);
    expect(m).not.toBeNull();
    const [x0, y0, x1, y1] = m!.slice(1).map(Number);
    expect(Math.hypot(x1 - x0, y1 - y0)).toBeGreaterThan(150);
  });
});
