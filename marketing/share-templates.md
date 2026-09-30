# Share templates

Used by the share button and the copy-to-clipboard fallback. Tokens in `{braces}` are filled at runtime. Keep every template under 240 characters after substitution so it fits on X with the link. No emoji. No em-dashes. The link always goes last.

Tokens: `{record}` (e.g. 14-3), `{wins}`, `{losses}`, `{date}` (e.g. Sep 29), `{rank}`, `{total}` (only if shown on-page; never invent), `{overall}`, `{position}`, `{url}` (result permalink with share card), `{streak}`.

## 17-0: daily

| Outcome | Template |
|---|---|
| 17-0 | `Unbeaten {date}: 17-0. Perfect season. Six picks, no losses. Your turn. {url}` |
| 15-2 to 16-1 | `Unbeaten {date}: {record}. {losses} short of perfect. Beat it. {url}` |
| 11-6 to 14-3 | `Unbeaten {date}: {record}. Playoff team. Not a perfect one. {url}` |
| 7-10 to 10-7 | `Unbeaten {date}: {record}. The draft looked better on paper. {url}` |
| 0-17 to 6-11 | `Unbeaten {date}: {record}. Somebody has to be the tank. Can you do worse? {url}` |

With leaderboard rank (only when the user is ranked):

`Unbeaten {date}: {record}, #{rank} on today's board. {url}`

## 17-0: practice (non-daily)

`Just went {record} on Unbeaten. Six random teams, one pick each, 17 games. {url}`

## Build a Player

| Outcome | Template |
|---|---|
| 95+ | `Built a {overall} overall {position} on Unbeaten from six random teams. Try to top it. {url}` |
| 85 to 94 | `Unbeaten: {overall} overall {position}, built from spare parts. {url}` |
| Below 85 | `Unbeaten: {overall} overall {position}. The spins were not kind. {url}` |

## Streak (lead owns the flame; plain text fallback)

`Unbeaten: {streak} days in a row. Today: {record}. {url}`

## Plain grid (copy to clipboard, no link preview)

```
Unbeaten {date}
{record}
W {wins}  L {losses}
{url}
```

## Rules

- Never claim a rank or percentile that is not on the result page.
- Never add "I won" or prize language. Nothing is won.
- The share card image (1200x630) carries the roster; the text does not need to list players.
- `game_shared` analytics event fires with `{ game, channel }` only. No text content is sent.
