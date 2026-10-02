import localFont from 'next/font/local';

// Name-style reward fonts. Not preloaded: a browser only downloads one when a name using it is on screen.
export const scoreboardFont = localFont({ src: '../fonts/jbmono-latin-var.woff2', variable: '--nf-scoreboard', weight: '400 800', display: 'swap', preload: false });
export const sharpieFont = localFont({ src: '../fonts/permanent-marker-latin-400-normal.woff2', variable: '--nf-sharpie', weight: '400', display: 'swap', preload: false });
export const stadiumFont = localFont({ src: '../fonts/bungee-latin-400-normal.woff2', variable: '--nf-stadium', weight: '400', display: 'swap', preload: false });
export const neonFont = localFont({ src: '../fonts/monoton-latin-400-normal.woff2', variable: '--nf-neon', weight: '400', display: 'swap', preload: false });
export const nameFontVariables = [scoreboardFont, sharpieFont, stadiumFont, neonFont].map((f) => f.variable).join(' ');
