// Generates the cosmetic art into public/cosmetics. Run: node scripts/cosmetics/build.mjs [banners|fx|frames]
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'public', 'cosmetics');
const only = process.argv[2];

async function emit(dir, mod, map) {
  const m = await import(mod);
  mkdirSync(join(root, dir), { recursive: true });
  let n = 0, bytes = 0;
  for (const [key, fn] of Object.entries(map)) {
    if (!m[fn]) { console.warn('missing', fn); continue; }
    const out = m[fn]();
    const files = typeof out === 'string' ? { [`${key}.svg`]: out } : Object.fromEntries(Object.entries(out).map(([suffix, s]) => [`${key}${suffix}.svg`, s]));
    for (const [name, s] of Object.entries(files)) { writeFileSync(join(root, dir, name), s); n++; bytes += s.length; }
  }
  console.log(`${dir}: ${n} files, ${Math.round(bytes / 1024)} KB`);
}

export const BANNERS = {
  'banner-field': 'field', 'banner-court': 'court', 'banner-diamond': 'diamond', 'banner-night': 'night', 'banner-sunset': 'sunset', 'banner-launch': 'launch',
  'banner-founder': 'founder', 'banner-endzone': 'endzone', 'banner-snow': 'snow', 'banner-playbook': 'playbook', 'banner-jumbotron': 'jumbotron', 'banner-retro': 'retro',
  'banner-marble': 'marble', 'banner-aurora': 'aurora', 'banner-confetti': 'confetti', 'banner-vault': 'vault',
};
export const BANNERS2 = {
  'banner-inferno': 'inferno', 'banner-stadium': 'stadium', 'banner-ocean': 'ocean', 'banner-city': 'city', 'banner-hive': 'hive',
  'banner-tunnel': 'tunnel', 'banner-pitch': 'pitch', 'banner-rink': 'rink', 'banner-ballpark': 'ballpark',
};
export const BANNERS3 = {
  'banner-trophy': 'trophy', 'banner-draft': 'draft', 'banner-synthwave': 'synthwave', 'banner-comic': 'comic', 'banner-circuit': 'circuit', 'banner-galaxy': 'galaxy',
  'banner-rain': 'rain', 'banner-gilded': 'gilded', 'banner-sakura': 'sakura', 'banner-matrix': 'matrix', 'banner-pixelcity': 'pixelcity', 'banner-summit': 'summit',
  'banner-scoreboard': 'scoreboard', 'banner-hologram': 'hologram',
};
export const BANNERS4 = { 'banner-eclipse': 'eclipse' };
if (!only || only === 'banners') { await emit('banners', './banners1.mjs', BANNERS); await emit('banners', './banners2.mjs', BANNERS2); await emit('banners', './banners3.mjs', BANNERS3); await emit('banners', './drops.mjs', BANNERS4); }

export const FX1 = { 'fx-sparks': 'sparks', 'fx-football': 'footballFx', 'fx-basketball': 'basketballFx', 'fx-baseball': 'baseballFx', 'fx-soccer': 'soccerFx', 'fx-hockey': 'hockeyFx', 'fx-comet': 'cometFx', 'fx-coins': 'coinsFx', 'fx-owner': 'crownFx', 'fx-bee': 'beeFx' };
if (!only || only === 'fx') { await emit('fx', './fx1.mjs', FX1); }

export const FX2 = { 'fx-snow': 'snow', 'fx-confetti': 'confetti', 'fx-embers': 'embers', 'fx-fireflies': 'fireflies', 'fx-sakura': 'sakuraFx', 'fx-hearts': 'hearts', 'fx-stars': 'starsFx', 'fx-bubbles': 'bubbles', 'fx-rain': 'rainFx', 'fx-fireworks': 'fireworks' };
if (!only || only === 'fx') { await emit('fx', './fx2.mjs', FX2); }

export const FX3 = { 'fx-halo': 'halo', 'fx-lightning': 'lightning', 'fx-flames': 'flamesFx', 'fx-ringfire': 'ringfireFx', 'fx-gyro': 'gyro', 'fx-shockwave': 'shockwave', 'fx-electric': 'electric', 'fx-aura-gold': 'auraGold', 'fx-aura-blue': 'auraBlue', 'fx-aura-violet': 'auraViolet', 'fx-glitch': 'glitch', 'fx-wings': 'wingsFx' };
if (!only || only === 'fx') { await emit('fx', './fx3.mjs', FX3); }
export const FX4 = { 'fx-meteors': 'meteors', 'fx-lasers': 'lasers' };
if (!only || only === 'fx') { await emit('fx', './drops.mjs', FX4); }

export const FRAMES = { 'ring-laurel': 'laurelGold', 'ring-laurel-silver': 'laurelSilver', 'ring-gems': 'gems', 'ring-spikes': 'spikes', 'ring-rays': 'rays', 'ring-pixel': 'pixel', 'ring-reel': 'reel', 'ring-circuit': 'circuit', 'ring-thorns': 'thorns', 'ring-chain': 'chain', 'ring-frost': 'frost', 'ring-allstar': 'allstar', 'ring-cup': 'cup', 'ring-crown': 'crownring' };
if (!only || only === 'frames') { await emit('frames', './frames.mjs', FRAMES); }
