import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

export const espnHeadshotUrl = (espnId: string) => `https://a.espncdn.com/i/headshots/nfl/players/full/${espnId}.png`;

/** Best image for a player: our R2 copy, then the stored source URL, then ESPN by id. Null means monogram. */
export function resolvePlayerImage(player: { imageBlobUrl?: string | null; imageUrl?: string | null; espnId?: string | null }): string | null {
  if (player.imageBlobUrl) return player.imageBlobUrl;
  if (player.imageUrl) return player.imageUrl;
  if (player.espnId) return espnHeadshotUrl(player.espnId);
  return null;
}

let client: S3Client | null = null;

function r2(): { client: S3Client; bucket: string; publicUrl: string } | null {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL } = process.env;
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET || !R2_PUBLIC_URL) return null;
  client ??= new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
  });
  return { client, bucket: R2_BUCKET, publicUrl: R2_PUBLIC_URL.replace(/\/$/, '') };
}

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/**
 * Download an image and store it in R2 under `key`. Returns the public URL, or null when R2 is not
 * configured or anything fails. Never throws.
 */
export async function cacheImageToR2(url: string, key: string): Promise<string | null> {
  try {
    const cfg = r2();
    if (!cfg) return null;
    const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') ?? 'application/octet-stream';
    if (!contentType.startsWith('image/')) return null;
    const body = Buffer.from(await res.arrayBuffer());
    if (body.length === 0 || body.length > MAX_IMAGE_BYTES) return null;
    const cleanKey = key.replace(/^\/+/, '');
    await cfg.client.send(new PutObjectCommand({
      Bucket: cfg.bucket, Key: cleanKey, Body: body, ContentType: contentType, CacheControl: 'public, max-age=31536000, immutable',
    }));
    return `${cfg.publicUrl}/${cleanKey}`;
  } catch (e) {
    console.warn('[images] R2 cache failed:', (e as Error).message);
    return null;
  }
}
