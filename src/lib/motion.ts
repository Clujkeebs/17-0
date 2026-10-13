/**
 * The Animations setting. A player can follow their device (the default), always animate, or never animate.
 * The resolved mode goes on <html data-motion="full|reduce"> before paint (THEME_SCRIPT), and everything animated
 * on the site keys off that one attribute: the shop art, banners, name styles, rings and the page's own motion.
 */
export type MotionPref = 'auto' | 'on' | 'off';
export type MotionMode = 'full' | 'reduce';
export const MOTION_KEY = 'gl-motion';

/** What the setting means on this device: `systemReduces` is the device's "reduce motion" preference. */
export const motionMode = (pref: MotionPref, systemReduces: boolean): MotionMode => (pref === 'on' ? 'full' : pref === 'off' ? 'reduce' : systemReduces ? 'reduce' : 'full');
export const parsePref = (raw: string | null | undefined): MotionPref => (raw === 'on' || raw === 'off' ? raw : 'auto');

/** Art that moves has a still twin (x.still.svg) drawn in its resting pose. */
export const stillOf = (src: string) => src.replace(/\.svg$/, '.still.svg');
