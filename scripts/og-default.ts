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

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face { font-family: 'Inter Variable'; font-weight: 100 900; src: url('${font('inter', 'inter-latin-wght-normal.woff2')}') format('woff2'); }
@font-face { font-family: 'JetBrains Mono Variable'; font-weight: 100 800; src: url('${font('jetbrains-mono', 'jetbrains-mono-latin-wght-normal.woff2')}') format('woff2'); }
* { margin: 0; box-sizing: border-box; }
html, body { width: 1200px; height: 630px; background: #0A1128; color: #F8F9FA; font-family: 'Inter Variable', sans-serif; overflow: hidden; }
.frame { position: absolute; inset: 0; padding: 72px 80px; display: flex; flex-direction: column; justify-content: space-between; }
.brand { display: flex; align-items: center; gap: 14px; font-weight: 800; font-size: 30px; letter-spacing: -0.03em; }
.brand svg { width: 40px; height: 40px; }
.score { font-family: 'JetBrains Mono Variable', monospace; font-weight: 700; font-size: 280px; line-height: .82; letter-spacing: -0.05em; color: #E76F51; font-variant-numeric: tabular-nums; }
.tag { font-size: 44px; font-weight: 700; letter-spacing: -0.02em; max-width: 900px; line-height: 1.15; }
.rule { position: absolute; right: -90px; top: 0; width: 360px; height: 630px; border-left: 2px solid #4A5568; transform: skewX(-12deg); transform-origin: top; }
.lines { position: absolute; right: 80px; top: 72px; bottom: 72px; display: flex; flex-direction: column; justify-content: space-between; align-items: flex-end; font-family: 'JetBrains Mono Variable', monospace; font-size: 20px; color: #B8C0CC; }
</style></head><body>
<div class="rule"></div>
<div class="lines"><span>SEED 0x17</span><span>W 17 &nbsp; L 0</span></div>
<div class="frame">
  <div class="brand"><svg viewBox="0 0 24 24" fill="none" stroke="#F8F9FA" stroke-width="2" stroke-linecap="square"><path d="M3 20 L12 4 L21 20"/><path d="M7 14 H17" stroke="#E76F51"/><path d="M9.5 20 V17 H14.5 V20"/></svg>Gridiron Lab</div>
  <div class="score">17-0</div>
  <div class="tag">Six picks. Seventeen games.<br>One perfect season.</div>
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
