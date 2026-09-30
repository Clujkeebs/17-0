import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { ImageResponse } from 'next/og';

let fonts: { name: string; data: Buffer; weight: 400 | 700 }[] | null = null;
async function loadFonts() {
  if (fonts) return fonts;
  const dir = path.join(process.cwd(), 'node_modules/@fontsource');
  const f = (p: string) => readFile(path.join(dir, p));
  fonts = [
    { name: 'Inter', data: await f('inter/files/inter-latin-400-normal.woff'), weight: 400 },
    { name: 'Inter', data: await f('inter/files/inter-latin-700-normal.woff'), weight: 700 },
  ];
  return fonts;
}

export interface CardInput { eyebrow: string; headline: string; perfect?: boolean; lines: { k: string; v: string }[]; footer: string }

export async function renderCard(c: CardInput) {
  const fs = await loadFonts();
  return new ImageResponse(
    (
      <div style={{ width: 1200, height: 630, background: '#FFFFFF', color: '#0A0A0A', display: 'flex', fontFamily: 'Inter', padding: 72 }}>
        <div style={{ display: 'flex', flexDirection: 'column', width: 620 }}>
          <div style={{ fontSize: 24, letterSpacing: 2, textTransform: 'uppercase', color: '#5E5C57', fontWeight: 700 }}>{c.eyebrow}</div>
          <div style={{ fontSize: 210, fontWeight: 700, lineHeight: 1, marginTop: 28, color: c.perfect ? '#C8102E' : '#0A0A0A', letterSpacing: -12 }}>{c.headline}</div>
          <div style={{ marginTop: 'auto', fontSize: 30, fontWeight: 700, display: 'flex', alignItems: 'center', letterSpacing: -1 }}>
            <svg width={40} height={40} viewBox="0 0 24 24" style={{ marginRight: 14 }}><rect width="24" height="24" rx="6" fill="#0A0A0A" /><path d="M7 6.5 V13 a5 5 0 0 0 10 0 V6.5" fill="none" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" /></svg>
            Unbeaten<span style={{ color: '#5E5C57', fontWeight: 400, marginLeft: 16, fontSize: 24, letterSpacing: 0 }}>{c.footer}</span>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, paddingLeft: 48, justifyContent: 'center' }}>
          <div style={{ display: 'flex', height: 2, background: '#0A0A0A' }} />
          {c.lines.slice(0, 6).map((l) => (
            <div key={l.k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 28, padding: '14px 0', borderBottom: '1px solid #E7E5E0' }}>
              <span style={{ color: '#5E5C57', fontWeight: 400, width: 110 }}>{l.k}</span>
              <span style={{ fontWeight: 700, flex: 1, display: 'flex', justifyContent: 'flex-end' }}>{l.v}</span>
            </div>
          ))}
        </div>
      </div>
    ),
    { width: 1200, height: 630, fonts: fs.map((f) => ({ name: f.name, data: f.data, weight: f.weight, style: 'normal' as const })) },
  );
}
