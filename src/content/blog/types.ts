// Blog types. Posts are data, rendered by src/app/(site)/blog. Keep copy free of em-dashes and en-dashes.
// A paragraph may link inside the site with [text](/path). Anything else stays plain text.

export interface BlogTable { caption: string; head: string[]; rows: string[][] }

/** A section: paragraphs, then an optional bullet list and table, then optional closing paragraphs. */
export interface BlogSection { h2: string; paragraphs: string[]; list?: string[]; table?: BlogTable; closing?: string[] }

/** Reader-facing sections of the blog, in the order the index shows them. */
export const BLOG_CATEGORIES = ['Strategy', 'The math', 'Fantasy football', 'Puzzles', 'Sports history', 'How the site works'] as const;
export type BlogCategory = (typeof BLOG_CATEGORIES)[number];

export const CATEGORY_INTRO: Record<BlogCategory, string> = {
  Strategy: 'How to draft better in 17-0, 82-0, 162-0 and 44-0: what each slot is worth, when a re-roll pays, and where a roster quietly loses games.',
  'The math': 'The formulas behind every grade, win line and ranking on the site, with worked examples you can check by hand.',
  'Fantasy football': 'Scoring formats, value over replacement, snake draft math, waivers and trades, written to match the tools on the fantasy hub.',
  Puzzles: 'Habits that help in Sports Connections, Sportle, Strands and the daily crossword, and how each puzzle is scored.',
  'Sports history': 'Perfect seasons, near misses and the arithmetic of winning every game.',
  'How the site works': 'Ranked and Casual play, points, Pick \'em, challenges, where the data comes from and a glossary of the terms.',
};

export interface BlogPost {
  slug: string;
  title: string;
  /** YYYY-MM-DD, the day it was published. */
  date: string;
  /** YYYY-MM-DD, set when a post is revised after publishing. */
  updated?: string;
  category: BlogCategory;
  excerpt: string;
  sections: BlogSection[];
}
