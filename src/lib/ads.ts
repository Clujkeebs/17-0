/** Google AdSense publisher ID. Public by design (it is also in /ads.txt). Env vars can override it. */
export const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT || process.env.GOOGLE_ADSENSE_CLIENT || 'ca-pub-3526440256333845';

/** Numeric ID of the 160x600 display unit made in AdSense. Without it the side rail renders nothing. */
export const ADSENSE_SIDE_SLOT = process.env.NEXT_PUBLIC_ADSENSE_SIDE_SLOT || '';

/** Ads only appear beside content on screens at least this wide. Phones and tablets never get one. */
export const SIDE_AD_MIN_WIDTH = 1100;
