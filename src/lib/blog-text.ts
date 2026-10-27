/**
 * Blog paragraphs are plain strings with one bit of markup: [text](/path) is a link inside the site.
 * Anything that is not a site path stays as text, so a post can never link off-site by accident.
 */
export type Inline = string | { text: string; href: string };

// The path starts with one slash and then something that is not a slash, which rules out //host.
const LINK = /\[([^\]\n]+)\]\((\/(?!\/)[A-Za-z0-9\-_/.#?=&%]*)\)/g;

export function parseInline(s: string): Inline[] {
  const out: Inline[] = [];
  let at = 0;
  for (const m of s.matchAll(LINK)) {
    if (m.index > at) out.push(s.slice(at, m.index));
    out.push({ text: m[1], href: m[2] });
    at = m.index + m[0].length;
  }
  if (at < s.length) out.push(s.slice(at));
  return out;
}

/** The text of a paragraph with link markup removed, for word counts and plain-text uses. */
export const plainText = (s: string) => s.replace(LINK, '$1');

/** Every site path a paragraph links to. */
export const linksIn = (s: string): string[] => [...s.matchAll(LINK)].map((m) => m[2]);
