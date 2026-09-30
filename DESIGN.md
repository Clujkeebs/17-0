# Unbeaten design system

The site should look like a film room, not a casino. Dark, flat, numeric, confident. Every rule below exists to keep it that way. The source of truth for tokens is `src/app/globals.css`; this file explains the why.

## 1. Palette

Six tokens and two derived values. Nothing else. No gradients, no glows, no glassmorphism, no heavy shadows, no team colors outside team-specific UI (and even there, only as a thin rule or chip, never a background fill behind text).

Contrast ratios are WCAG 2.x relative luminance ratios, computed against `--navy` (#0A1128), the page background, and `--surface` (#111A36), the card background.

| Token | Hex | Role | vs navy | vs surface | Allowed as text? |
|---|---|---|---|---|---|
| `--navy` | #0A1128 | Page background. Text on orange buttons. | 1.00 | 1.09 | Only on orange (6.04:1) |
| `--surface` | #111A36 | Cards, inputs lifted off the page | 1.09 | 1.00 | No |
| `--green` | #1B4332 | Summary boxes, success, warn banners | 1.69 | 1.55 | No. Background only. Bone on green is 10.51:1 |
| `--bone` | #F8F9FA | Primary text, icons | **17.73** | **16.26** | Yes, AAA |
| `--bone-dim` | #B8C0CC | Secondary text, labels, eyebrows | **10.19** | **9.35** | Yes, AAA |
| `--orange` | #E76F51 | The one accent: primary buttons, focus rings, big numbers, link underlines | **6.04** | **5.54** | Yes, AA at any size. On green it drops to 3.58: large text only |
| `--steel` | #4A5568 | Borders, dividers, table rules | 2.48 | 2.28 | No. Decorative lines only |
| `--danger` | #B91C1C | Error borders, error banner fill | 2.89 | 2.65 | No. Bone on danger is 6.14:1. Error *text* on navy uses #F2A3A3 (9.38:1) |

Rules:

- **One accent.** Orange is for the single most important thing in a view: the primary action, the big number, focus. If two things on screen are orange, one of them is wrong.
- **Steel is not a text color.** At 2.48:1 it fails for text. It is also below the 3:1 non-text threshold (WCAG 1.4.11), so a form control must never rely on a steel border alone to be identifiable: inputs sit on navy inside a surface or carry a visible label, and focus switches the border to orange.
- **Green is a surface, not a signal.** Wins are marked with text ("W") and a symbol, never green alone.
- **Danger is for errors.** Not for losses in a simulated season, which are just "L".

## 2. Typography

Two families, self-hosted via `@fontsource-variable`. No others, no Google Fonts CDN.

| Use | Family | Weight | Notes |
|---|---|---|---|
| UI, headings, body | Inter Variable | 400 body, 600 labels, 700 to 800 headings | `cv11`, `ss01` enabled. Headings use -0.02em tracking |
| Numbers | JetBrains Mono Variable | 700 for big numbers | Class `num` or `big-num`. Always `tabular-nums` so columns align |

Scale:

- `h1`: `clamp(2rem, 5vw, 3.5rem)`. One per page.
- `h2`: `clamp(1.4rem, 3vw, 2rem)`.
- `h3`: 1.15rem.
- Body: 16px, line-height 1.55. Prose max width 70ch.
- `.eyebrow`: 0.75rem, uppercase, 0.14em tracking, bone-dim. Sits above a heading to name the section.
- `.big-num`: `clamp(3rem, 10vw, 6.5rem)`, line-height 0.9, -0.04em tracking. For the record ("14-3"), the rating ("94"), the score.

Every number a user might compare (ratings, records, scores, ranks, percentages) is set in mono. Words are never set in mono except code and cookie names.

## 3. Layout principles

- **Asymmetric grids.** Avoid three equal columns of equal cards. Prefer 2:1, 1.4:1:1, or a wide card beside a stack. Symmetry reads as template; asymmetry reads as edited.
- **The two games have two shapes.** On the home page and game index, the **17-0 card is wide** (landscape, spans roughly two thirds, record set in `big-num`) because the game is about a season laid out left to right. The **Build a Player card is tall** (portrait, one third, attributes stacked vertically) because the game builds one player top to bottom. Keep those silhouettes wherever the two appear together.
- **Diagonal dividers.** Sections are separated by `hr.divider`: a thin steel rule at a slight angle. It is the only decorative element in the system. Do not add chevrons, stripes, field-turf textures, or yard lines.
- **Container.** Max width 1200px, 16px side gutter at every breakpoint. No horizontal scroll at 320px. Tables scroll inside `.table-wrap`, never the page.
- **Section rhythm.** `.section` is 48px vertical. Cards are 20px padded, 2px radius, 1px steel border. Corners stay near-square: the radius is 2px everywhere.
- **Density over decoration.** A leaderboard row should show rank, name, record, score in one line on a phone. If something does not help someone read the numbers, cut it.

## 4. Motion

- **Max 2px translate.** Hover lifts buttons `translateY(-2px)`. Nothing moves farther than 2px in response to hover or focus.
- **Durations 120ms to 200ms**, `ease`. Only the spin reel runs longer, and it is decorative.
- **`prefers-reduced-motion: reduce`** collapses all animation and transition durations to near zero. The reel result is announced in a live region, so nothing depends on seeing it spin.
- No parallax, no scroll-jacking, no auto-playing video, no bouncing, no confetti. A 17-0 season earns a bigger number, not fireworks.
- Skeletons pulse opacity only, never shimmer across.

## 5. Anti-patterns

Do not ship any of these:

- Gradients of any kind (the divider's hard-stop gradient is a line-drawing technique, not a gradient look).
- Glow, neon, drop shadows deeper than 0, blurred glass panels.
- Stock stadium photos, lens flares, fire effects, lightning bolts.
- Icon libraries (lucide, heroicons, Font Awesome). Only `src/components/Icons.tsx`.
- Emoji in UI copy. The streak flame is the single exception and belongs to the lead.
- Color as the only carrier of meaning.
- Rounded pill buttons, 12px+ radii, bubbly cards.
- Centered hero, centered subhead, two centered buttons, three centered feature cards. The default landing page template.
- Fake social proof: testimonials, user counts, "trusted by" logo walls.
- EA or NFL visual identity: their logos as our decoration, their fonts, their card frames, their screens.
- Modal pop-ups for the newsletter. It lives inline and in the footer.
- Text in `--steel` or `--danger`.

## 6. Copy voice

Dry, confident, statistically literate. Writes like someone who watches All-22 and argues EPA per play, not like a brand. Short sentences. Specific numbers. Explains the model when it matters, then gets out of the way.

Hard rules:

- No em-dashes (U+2014). Avoid en-dashes in prose. Use commas, periods, colons, or "to" (e.g. "10 to 14 days").
- No emoji (except the lead's streak flame).
- Banned words: unlock, elevate, seamless, game-changing, next level, dream roster, powerful, intuitive.
- Never use "Madden" as branding. Say "EA Sports Madden NFL ratings" descriptively when citing the source.
- No fake testimonials, no user counts.

| Situation | Good | Bad |
|---|---|---|
| Hero | Six picks. Seventeen games. One perfect season. | Unlock your dream roster and take your football IQ to the next level! |
| Result, strong | 15-2. Your secondary carried a pass rush that was never there. | Amazing!! You crushed it!!! |
| Result, weak | 6-11. The offensive line allowed pressure on 41% of dropbacks. That is the season. | Better luck next time! |
| Empty leaderboard | No results yet today. The first one sets the bar. | Be the first to join thousands of players! |
| Error | That username is taken. Try another. | Oops! Something went wrong. |
| Newsletter | Six teams, every morning. One email. | Join our community and never miss out! |
| Explaining the engine | Each pick is scored with position weights, then a seeded season is simulated. Same seed, same picks, same record. | Our powerful AI-driven engine delivers intuitive results. |
| Legal | We never sell your data. Ever. | We value your privacy and are committed to protecting it. |

## 7. Icons

- Custom SVG only, defined in `src/components/Icons.tsx`.
- 24x24 viewBox, `stroke="currentColor"`, stroke width 1.75, square caps, no fills (except the navy tile in `public/icon.svg`).
- Straight lines and simple geometry. No rounded, cartoon, or duotone icons.
- Decorative icons get `aria-hidden`. Icons that carry meaning take a `title` prop, which sets `role="img"` and a `<title>`.
- Icons accompany text labels. An icon-only button needs an accessible name.
- The logo mark is an A-frame (goalpost read as a letter A) with a crossbar. In `public/icon.svg` the crossbar is orange on a navy square; in the UI it inherits `currentColor`.

## 8. Accessibility baseline

WCAG 2.2 AA. 3px orange focus ring on everything, never removed. 44px minimum target height. Skip link first in tab order. One `h1` per page. Labels on every input. Tables use `scope` on headers. Live regions for game results. See `/legal/accessibility`.
