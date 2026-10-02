/**
 * Renders public/og-default.png (1200x630) with headless Chromium via playwright-core.
 * Usage: npx tsx scripts/og-default.ts
 * Chromium path: $CHROMIUM_PATH, else the first chrome binary found under /opt/pw-browsers.
 */
import { chromium } from 'playwright-core';
import { existsSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = resolve(import.meta.dirname, '..');
const out = join(root, 'public', 'og-default.png');

function findChromium(): string | undefined {
  if (process.env.CHROMIUM_PATH && existsSync(process.env.CHROMIUM_PATH)) return process.env.CHROMIUM_PATH;
  const base = '/opt/pw-browsers';
  if (!existsSync(base)) return undefined;
  const dirs = readdirSync(base).filter((d) => d.startsWith('chromium')).sort((a, b) => Number(a.includes('headless')) - Number(b.includes('headless')));
  for (const d of dirs) {
    for (const rel of ['chrome-linux/chrome', 'chrome-linux/headless_shell', 'chrome-headless-shell-linux64/chrome-headless-shell']) {
      const p = join(base, d, rel);
      if (existsSync(p)) return p;
    }
  }
  return undefined;
}

const font = (pkg: string, file: string) => pathToFileURL(join(root, 'node_modules', '@fontsource-variable', pkg, 'files', file)).href;

// Matches the live design: white and paper, near-black type, one signal-red accent, the goalpost mark, Inter only.
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face { font-family: 'Inter Variable'; font-weight: 100 900; src: url('${font('inter', 'inter-latin-wght-normal.woff2')}') format('woff2'); }
* { margin: 0; box-sizing: border-box; }
html, body { width: 1200px; height: 630px; background: #FFFFFF; color: #0A0A0A; font-family: 'Inter Variable', sans-serif; overflow: hidden; }
.paper { position: absolute; right: 0; top: 0; bottom: 0; width: 420px; background: #F5F4F0; border-left: 1px solid #E7E5E0; }
.frame { position: absolute; inset: 0; padding: 64px 72px; display: flex; flex-direction: column; justify-content: space-between; }
.brand { display: flex; align-items: center; gap: 16px; font-weight: 700; font-size: 38px; letter-spacing: -0.035em; }
.score { font-weight: 800; font-size: 250px; line-height: .8; letter-spacing: -0.06em; font-variant-numeric: tabular-nums; }
.score .z { color: #C8102E; }
.tag { font-size: 46px; font-weight: 700; letter-spacing: -0.03em; line-height: 1.12; }
.more { margin-top: 18px; font-size: 25px; font-weight: 500; color: #5E5C57; letter-spacing: -0.01em; }
.side { position: absolute; right: 64px; top: 64px; bottom: 64px; width: 292px; display: flex; flex-direction: column; justify-content: space-between; }
.rec { border-top: 2px solid #0A0A0A; }
.rec div { display: flex; justify-content: space-between; padding: 13px 0; border-bottom: 1px solid #E7E5E0; font-size: 23px; font-weight: 600; font-variant-numeric: tabular-nums; }
.rec span:first-child { color: #5E5C57; font-weight: 500; }
.url { font-size: 24px; font-weight: 600; letter-spacing: -0.01em; text-align: right; }
</style></head><body>
<div class="paper"></div>
<div class="frame">
  <div class="brand">
    <svg width="54" height="54" viewBox="0 0 24 24" aria-hidden="true"><rect width="24" height="24" rx="6.5" fill="#0A0A0A"/><path d="M7.4 4.6 V10.6 Q7.4 14.2 11 14.2 H13 Q16.6 14.2 16.6 10.6 V4.6" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round"/><path d="M12 14.2 V19.6" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round"/><g transform="rotate(-32 12 8.4)"><ellipse cx="12" cy="8.4" rx="2.5" ry="1.55" fill="#C8102E"/><path d="M10.9 8.4 H13.1" stroke="#FFFFFF" stroke-width=".6" stroke-linecap="round"/></g></svg>
    Unbeaten
  </div>
  <div class="score">17-<span class="z">0</span></div>
  <div>
    <div class="tag">Six picks. Seventeen games.<br>One perfect season.</div>
    <div class="more">Plus Build a Player and 16 daily NFL games.</div>
  </div>
</div>
<div class="side">
  <div class="rec">
    <div><span>QB</span><span>A+</span></div>
    <div><span>WR</span><span>A</span></div>
    <div><span>RB</span><span>A</span></div>
    <div><span>DEF</span><span>A-</span></div>
    <div><span>HC</span><span>B+</span></div>
    <div><span>TE</span><span>B</span></div>
  </div>
  <div class="url">playunbeaten.com</div>
</div>
</body></html>`;

async function main() {
  const executablePath = findChromium();
  if (!executablePath) throw new Error('No Chromium found. Set CHROMIUM_PATH.');
  const browser = await chromium.launch({ executablePath, args: ['--allow-file-access-from-files', '--no-sandbox'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
    // Load from a file: origin so file:// font URLs resolve.
    await page.goto(pathToFileURL(join(root, 'public')).href + '/');
    await page.setContent(html, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: out, type: 'png', clip: { x: 0, y: 0, width: 1200, height: 630 } });
    console.log(`Wrote ${out}`);
  } finally {
    await browser.close();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
