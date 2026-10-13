import { createHash } from 'node:crypto';

/**
 * Profile pictures are stored as small data URLs. Pages never inline them: they point at /api/avatar/{username}?v={hash},
 * a cacheable image URL, so a leaderboard of a hundred players costs a hundred tiny cached requests, not a megabyte of HTML.
 * The version is the first 8 characters of the md5 of the stored string (Postgres md5() gives the same value).
 */
export const imageVersion = (image: string | null | undefined) => (image ? createHash('md5').update(image).digest('hex').slice(0, 8) : null);
export const avatarUrl = (username: string | null | undefined, version: string | null | undefined) =>
  username && version && /^[A-Za-z0-9_]{3,20}$/.test(username) ? `/api/avatar/${username}?v=${version}` : null;

/** The bytes and content type of a stored data URL, or null if it is not one of the three formats we accept. */
export function decodeDataUrl(dataUrl: string | null | undefined): { type: string; bytes: Buffer } | null {
  const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl ?? '');
  return m ? { type: m[1], bytes: Buffer.from(m[2], 'base64') } : null;
}
