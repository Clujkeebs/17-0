import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { ImageResponse } from 'next/og';

let fonts: { name: string; data: Buffer; weight: 400 | 700 | 800 }[] | null = null;
async function loadFonts() {
  if (fonts) return fonts;
  const dir = path.join(process.cwd(), 'node_modules/@fontsource');
  const f = (p: string) => readFile(path.join(dir, p));
  fonts = [
    { name: 'Inter', data: await f('inter/files/inter-latin-400-normal.woff'), weight: 400 },
    { name: 'Inter', data: await f('inter/files/inter-latin-700-normal.woff'), weight: 700 },
    { name: 'Mono', data: await f('jetbrains-mono/files/jetbrains-mono-latin-800-normal.woff'), weight: 800 },
  ];
  return fonts;
}

export interface CardInput { eyebrow: string; headline: string; perfect?: boolean; lines: { k: string; v: string }[]; footer: string }

export async function renderCard(c: CardInput) {
  const fs = await loadFonts();
  return new ImageResponse(
    (
      <div style={{ width: 1200, height: 630, background: '#0A1128', color: '#F8F9FA', display: 'flex', fontFamily: 'Inter', padding: 64, position: 'relative' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, width: 16, height: 630, background: '#E76F51', display: 'flex' }} />
        <div style={{ display: 'flex', flexDirection: 'column', width: 640 }}>
          <div style={{ fontSize: 26, letterSpacing: 5, textTransform: 'uppercase', color: '#B8C0CC', fontWeight: 700 }}>{c.eyebrow}</div>
          <div style={{ fontFamily: 'Mono', fontSize: 220, fontWeight: 800, lineHeight: 1, marginTop: 24, color: c.perfect ? '#E76F51' : '#F8F9FA', letterSpacing: -10 }}>{c.headline}</div>
          <div style={{ marginTop: 'auto', fontSize: 28, fontWeight: 700, display: 'flex' }}>Gridiron<span style={{ color: '#E76F51' }}>Lab</span><span style={{ color: '#B8C0CC', fontWeight: 400, marginLeft: 16 }}>{c.footer}</span></div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, borderLeft: '2px solid #4A5568', paddingLeft: 40, justifyContent: 'center' }}>
          {c.lines.slice(0, 6).map((l) => (
            <div key={l.k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 28, padding: '10px 0', borderBottom: '1px solid #4A5568' }}>
              <span style={{ color: '#B8C0CC', fontWeight: 700, width: 110 }}>{l.k}</span>
              <span style={{ fontWeight: 700, flex: 1, display: 'flex', justifyContent: 'flex-end' }}>{l.v}</span>
            </div>
          ))}
        </div>
      </div>
    ),
    { width: 1200, height: 630, fonts: fs.map((f) => ({ name: f.name, data: f.data, weight: f.weight, style: 'normal' as const })) },
  );
}
