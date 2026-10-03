import localFont from 'next/font/local';

// Name-style fonts (streak rewards and shop items). Not preloaded: a browser only downloads one when a name using it is on screen.
export const scoreboardFont = localFont({ src: '../fonts/jbmono-latin-var.woff2', variable: '--nf-scoreboard', weight: '400 800', display: 'swap', preload: false });
export const sharpieFont = localFont({ src: '../fonts/permanent-marker-latin-400-normal.woff2', variable: '--nf-sharpie', weight: '400', display: 'swap', preload: false });
export const stadiumFont = localFont({ src: '../fonts/bungee-latin-400-normal.woff2', variable: '--nf-stadium', weight: '400', display: 'swap', preload: false });
export const neonFont = localFont({ src: '../fonts/monoton-latin-400-normal.woff2', variable: '--nf-neon', weight: '400', display: 'swap', preload: false });
export const collegiateFont = localFont({ src: '../fonts/graduate-latin-400-normal.woff2', variable: '--nf-collegiate', weight: '400', display: 'swap', preload: false });
export const arcadeFont = localFont({ src: '../fonts/press-start-2p-latin-400-normal.woff2', variable: '--nf-arcade', weight: '400', display: 'swap', preload: false });
export const headlineFont = localFont({ src: '../fonts/bebas-neue-latin-400-normal.woff2', variable: '--nf-headline', weight: '400', display: 'swap', preload: false });
export const westernFont = localFont({ src: '../fonts/rye-latin-400-normal.woff2', variable: '--nf-western', weight: '400', display: 'swap', preload: false });
export const comicFont = localFont({ src: '../fonts/bangers-latin-400-normal.woff2', variable: '--nf-comic', weight: '400', display: 'swap', preload: false });
export const futureFont = localFont({ src: '../fonts/orbitron-latin-400-normal.woff2', variable: '--nf-future', weight: '400', display: 'swap', preload: false });
export const scriptFont = localFont({ src: '../fonts/pacifico-latin-400-normal.woff2', variable: '--nf-script', weight: '400', display: 'swap', preload: false });
export const stencilFont = localFont({ src: '../fonts/black-ops-one-latin-400-normal.woff2', variable: '--nf-stencil', weight: '400', display: 'swap', preload: false });
export const nameFontVariables = [scoreboardFont, sharpieFont, stadiumFont, neonFont, collegiateFont, arcadeFont, headlineFont, westernFont, comicFont, futureFont, scriptFont, stencilFont].map((f) => f.variable).join(' ');
