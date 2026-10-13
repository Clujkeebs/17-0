import { describe, expect, it } from 'vitest';
import { motionMode, parsePref, stillOf } from '@/lib/motion';
import { THEME_SCRIPT } from '@/components/ThemeToggle';

describe('the Animations setting', () => {
  it('follows the device by default, and the player can force it either way', () => {
    expect(motionMode('auto', false)).toBe('full');
    expect(motionMode('auto', true)).toBe('reduce');
    expect(motionMode('on', true)).toBe('full');
    expect(motionMode('off', false)).toBe('reduce');
  });
  it('reads a stored choice, and anything odd means follow the device', () => {
    expect(parsePref('on')).toBe('on'); expect(parsePref('off')).toBe('off');
    expect(parsePref('maybe')).toBe('auto'); expect(parsePref(null)).toBe('auto'); expect(parsePref(undefined)).toBe('auto');
  });
  it('art has a still twin beside it', () => { expect(stillOf('/cosmetics/fx/fx-meteors.svg')).toBe('/cosmetics/fx/fx-meteors.still.svg'); });

  it('the script that runs before paint sets html data-motion the same way, and never throws', () => {
    const run = (stored: string | null, systemReduces: boolean, broken = false) => {
      const dataset: Record<string, string> = {};
      const win = { matchMedia: (q: string) => ({ matches: q.includes('reduced-motion') ? systemReduces : false }) };
      const ls = { getItem: (k: string) => { if (broken) throw new Error('blocked'); return k === 'gl-motion' ? stored : null; } };
      new Function('window', 'localStorage', 'document', THEME_SCRIPT)(win, ls, { documentElement: { dataset } });
      return dataset.motion;
    };
    expect(run(null, false)).toBe('full');
    expect(run(null, true)).toBe('reduce');
    expect(run('on', true)).toBe('full');
    expect(run('off', false)).toBe('reduce');
    expect(run(null, true, true)).toBe('full');   // storage blocked: do not freeze the page
  });
});
