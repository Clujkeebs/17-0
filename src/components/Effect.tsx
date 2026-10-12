/**
 * Shop effects and ornate frames: animated SVG art drawn at twice the avatar's size, centred on it, so
 * anything outside the picture floats around it. The files live in public/cosmetics (built by
 * scripts/cosmetics) and carry their own CSS animation, which stands still for reduced motion.
 * Decorative only, so every image is hidden from assistive tech and has no alt text.
 */

/** Effects drawn in two layers: the back one sits behind the picture (fire, glow, wings), the front one on top. */
export const EFFECT_BACK = new Set(['fx-flames', 'fx-ringfire', 'fx-aura-gold', 'fx-aura-blue', 'fx-aura-violet', 'fx-wings', 'fx-lasers']);

/** Avatar borders that also draw an ornate frame over the picture. */
export const FRAMED = new Set([
  'ring-laurel', 'ring-laurel-silver', 'ring-gems', 'ring-spikes', 'ring-rays', 'ring-pixel', 'ring-reel',
  'ring-circuit', 'ring-thorns', 'ring-chain', 'ring-frost', 'ring-allstar', 'ring-cup', 'ring-crown',
]);

const art = (src: string, cls: string) => (
  <img className={`fx-img ${cls}`} src={src} alt="" aria-hidden="true" width={200} height={200} decoding="async" draggable={false} />
);

/** The layers for one effect. Must sit inside an .fx-wrap that is exactly as big as the picture. */
export function Effect({ k }: { k?: string | null }) {
  if (!k) return null;
  return (
    <>
      {EFFECT_BACK.has(k) && art(`/cosmetics/fx/${k}-back.svg`, 'fx-back')}
      {art(`/cosmetics/fx/${k}.svg`, 'fx-front')}
    </>
  );
}

/** The frame art for an avatar border, when it has one. */
export function Frame({ k }: { k?: string | null }) {
  if (!k || !FRAMED.has(k)) return null;
  return art(`/cosmetics/frames/${k}.svg`, 'fx-frame');
}

/** The leaderboard version: a small animated mark before the name, the effect's art drawn around a faint disc. */
export function NameEffect({ k }: { k?: string | null }) {
  if (!k) return null;
  return (
    <span className="nm-fx fx-wrap" aria-hidden="true">
      <span className="nm-fx-core" />
      <Effect k={k} />
    </span>
  );
}
