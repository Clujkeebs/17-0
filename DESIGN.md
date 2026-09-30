# Unbeaten design system

Clean, light, editorial. Think a sports magazine printed on good paper: lots of white, big confident type, one accent, nothing shouting. Tokens live in `src/app/globals.css`; this file explains why.

## 1. Palette

Token names are legacy (from the old dark theme) and are shared with the game UI, so they stay. Values are the light system.

| Token | Hex | Role | on #FFF | on --green |
|---|---|---|---|---|
| `--navy` | #FFFFFF | Page background (also `viewport.themeColor`) | | |
| `--surface` | #FFFFFF | Card background, always with a `--steel` hairline | | |
| `--green` | #F5F4F0 | Warm paper tint: secondary surfaces, footer, feature tiles | | |
| `--bone` | #0A0A0A | Primary text, primary buttons, dark feature panels | 19.8:1 | 18.0:1 |
| `--bone-dim` | #5E5C57 | Secondary text, labels, eyebrows | 6.7:1 | 6.1:1 |
| `--orange` | #C8102E | The single accent (signal red) | 5.9:1 | 5.4:1 |
| `--steel` | #E7E5E0 | Hairlines and dividers. Decorative only, never text | 1.3:1 | |
| `--steel-hi` | #8A8780 | Input and UI control borders (WCAG 1.4.11) | 3.6:1 | 3.3:1 |
| `--danger` | #B42318 | Errors | 6.6:1 | 6.0:1 |

On dark panels (`--bone` background) secondary text is #B5B3AE (9.5:1).

**Why signal red.** It is the color of a penalty flag and a scoreboard digit, so it belongs to football without being a team color. It passes AA for body text on white and on paper, and it is warm enough to sit next to the off-white tint. It is used sparingly: focus rings, the live dot, formula weights, losses, a perfect 17-0. Primary buttons are near-black, not red, so the accent stays a signal rather than a fill.

Rules:
- One accent per view, used for meaning, not decoration.
- Team colors appear only as small accents (a 3px rule under a logo, a monogram rule). Never as fills behind text.
- W/L and other states always carry a letter or word, never color alone.
- Shadows are soft and rare (hover lift on game tiles, the cookie notice). No glows.

## 2. Typography

One family: Inter variable, self-hosted via `next/font/local`. `--font-num` also points at Inter; numbers use tabular figures (`.num`, `.big-num`, `.stat .v`) so columns align.

- Display (`.hero-h1`): up to 7.5rem, weight 700, tracking -0.055em, line-height .95.
- `h1`: `clamp(2.4rem, 5.6vw, 4.25rem)`, tracking -0.04em. One per page.
- `h2`: `clamp(1.6rem, 3vw, 2.25rem)`, tracking -0.028em. Headings are `text-wrap: balance`.
- Body: 17px, line-height 1.6. Long form (`.prose`) 1.05rem / 1.72, 68ch max.
- UI chrome (nav, eyebrows, table heads): .72 to .9rem, weight 500 to 600. Eyebrows uppercase with .08em tracking.

## 3. Layout and components

- Container 1200px plus a 20px (mobile) or 32px gutter. Sections breathe: 56px mobile, 96px desktop.
- Radii: 10px inputs, 14px cards, 22px feature panels, pill buttons.
- Buttons: `.btn` is a white pill with a `--steel-hi` border; `.btn-primary` is solid near-black; on dark panels the primary inverts to white.
- Lists and tables use a 1px near-black top rule and hairline row separators, like a printed stat sheet.
- Header: sticky, translucent white with backdrop blur and a hairline. Wordmark "Unbeaten" plus a small outlined 17-0 mark; one black pill CTA.
- Footer: paper tint, newsletter first, link columns, then brand line, address and the non-affiliation disclaimer.
- Profiles: large rounded portrait (monogram fallback on paper with a thin team-color rule), huge OVR, attributes as a ruled list with thin meters.

## 4. Accessibility

Focus is a 2px red outline with 3px offset (inputs use a dark border plus a soft red ring). Skip link, labels on every field, `prefers-reduced-motion` respected, all text at least 4.5:1, all control borders at least 3:1.

## 5. Copy

No em or en dashes in user-facing copy. No emoji except the profile streak flame. Icons are custom SVG in `src/components/Icons.tsx` only.
