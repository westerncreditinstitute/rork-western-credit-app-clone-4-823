/**
 * Shared Bunny Stream embed URL signing.
 *
 * Signing is pure local computation (a hash of key + video id + expiry), so
 * routes can include ready-to-play embed URLs directly in their responses -
 * e.g. the course videos query - instead of forcing the client to make a
 * separate round trip before every playback.
 */

const TOKEN_TTL_SECONDS = 3600;

/** Legacy Bunny token scheme: hash(apiKey + videoId + expires) + expires. */
export function generateBunnyToken(
  libraryId: string,
  videoId: string,
  expirationTime: number,
  apiKey: string
): string {
  const hashableBase = `${apiKey}${videoId}${expirationTime}`;

  let hash = 0;
  for (let i = 0; i < hashableBase.length; i++) {
    const char = hashableBase.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }

  return Math.abs(hash).toString(16) + expirationTime.toString(16);
}

export interface SignedBunnyUrls {
  embedUrl: string;
  directUrl: string;
  /** Unix ms when the token expires, or null when token auth is not configured. */
  expiresAt: number | null;
}

/**
 * Builds an embed + direct playback URL for a Bunny video. When no API key is
 * configured the URLs are returned unsigned (token authentication is off in
 * that mode), so callers never need a second code path.
 */
export function signBunnyEmbedUrl(libraryId: string, videoId: string): SignedBunnyUrls {
  const apiKey = process.env.BUNNY_STREAM_API_KEY;

  if (!apiKey) {
    return {
      embedUrl: `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}`,
      directUrl: `https://iframe.mediadelivery.net/play/${libraryId}/${videoId}`,
      expiresAt: null,
    };
  }

  const expirationTime = Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS;
  const token = generateBunnyToken(libraryId, videoId, expirationTime, apiKey);

  return {
    embedUrl: `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}?token=${token}&expires=${expirationTime}`,
    directUrl: `https://iframe.mediadelivery.net/play/${libraryId}/${videoId}?token=${token}&expires=${expirationTime}`,
    expiresAt: expirationTime * 1000,
  };
}
