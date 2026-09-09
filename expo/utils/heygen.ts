/** The HeyGen embed used when the admin hasn't configured one yet. */
export const DEFAULT_HEYGEN_EMBED_ID = "92770d6dd5164282bbeabb6a890f3f41";

/**
 * Extracts a HeyGen embed id from whatever the admin pasted.
 *
 * Accepts a bare id, a full embed URL (`app.heygen.com/embeds/<id>`), a share
 * URL (`app.heygen.com/share/<id>`), or an `<iframe src="...">` snippet.
 * Returns an empty string when nothing usable is found.
 */
export function parseHeyGenEmbedId(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";

  const fromPath = trimmed.match(/(?:embeds|share)\/([A-Za-z0-9_-]+)/);
  if (fromPath?.[1]) return fromPath[1];

  // Bare id: reject anything that still looks like a URL or markup.
  if (/^[A-Za-z0-9_-]+$/.test(trimmed)) return trimmed;

  return "";
}

/** Full playable URL for a HeyGen embed id. */
export function heyGenEmbedUrl(embedId: string): string {
  return `https://app.heygen.com/embeds/${embedId}`;
}
