/**
 * The shop catalog. Points are earned by playing (see src/lib/server/points.ts) and spent here on cosmetics.
 * Points have no cash value and cannot be bought. Limited items have a fixed stock, first come first served.
 * Owner-only items are never for sale: only the owner account has them, decided on the server by email.
 */
export type ItemKind = 'font' | 'color' | 'border' | 'banner' | 'title' | 'flair';
export interface ShopItem {
  key: string;
  kind: ItemKind;
  label: string;
  price: number;
  /** Limited edition: only this many will ever be sold. */
  limit?: number;
  /** Owner exclusive: not sold, not equippable by anyone else. */
  ownerOnly?: boolean;
  /** One line for the shop card. */
  blurb?: string;
}

export const KIND_LABELS: Record<ItemKind, string> = {
  font: 'Name fonts', color: 'Name colors', border: 'Avatar borders', banner: 'Profile banners', title: 'Titles', flair: 'Leaderboard flair',
};
export const KIND_ORDER: ItemKind[] = ['color', 'font', 'border', 'banner', 'title', 'flair'];

export const SHOP_ITEMS: ShopItem[] = [
  // Name colors (every flat color keeps 4.5:1 on white; gradients are bold enough to read)
  { key: 'teal', kind: 'color', label: 'Teal', price: 150 },
  { key: 'plum', kind: 'color', label: 'Plum', price: 150 },
  { key: 'brick', kind: 'color', label: 'Brick', price: 150 },
  { key: 'forest', kind: 'color', label: 'Forest', price: 200 },
  { key: 'sunset', kind: 'color', label: 'Sunset', price: 450, blurb: 'Orange into red.' },
  { key: 'ice', kind: 'color', label: 'Ice', price: 450, blurb: 'Cold blue gradient.' },
  { key: 'chrome', kind: 'color', label: 'Chrome', price: 700, blurb: 'Polished steel.' },
  { key: 'gold-foil', kind: 'color', label: 'Gold foil', price: 900, blurb: 'Championship ring gold.' },
  { key: 'aurora', kind: 'color', label: 'Aurora', price: 1500, limit: 50, blurb: 'Slowly shifting colors. Launch edition, 50 made.' },
  { key: 'founders', kind: 'color', label: 'Founders gold', price: 2500, limit: 20, blurb: 'Animated gold. Only 20 will ever exist.' },
  { key: 'owner-blaze', kind: 'color', label: 'Blaze', price: 0, ownerOnly: true, blurb: 'Owner exclusive.' },

  // Name fonts
  { key: 'varsity', kind: 'font', label: 'Varsity', price: 300, blurb: 'Slanted block letters.' },
  { key: 'ticker', kind: 'font', label: 'Ticker', price: 300, blurb: 'All caps, wide, like a bottom-line crawl.' },
  { key: 'locker', kind: 'font', label: 'Locker room', price: 400, blurb: 'Marker, slanted.' },
  { key: 'broadcast', kind: 'font', label: 'Broadcast', price: 600, blurb: 'Heavy italic, TV graphics style.' },
  { key: 'hall', kind: 'font', label: 'Hall of Fame', price: 1200, limit: 50, blurb: 'Engraved serif small caps. 50 made.' },

  // Avatar borders
  { key: 'ring-ink', kind: 'border', label: 'Ink ring', price: 100 },
  { key: 'ring-red', kind: 'border', label: 'Signal ring', price: 150 },
  { key: 'ring-turf', kind: 'border', label: 'Turf ring', price: 150 },
  { key: 'ring-gold', kind: 'border', label: 'Gold ring', price: 500 },
  { key: 'ring-gradient', kind: 'border', label: 'Spectrum ring', price: 800 },
  { key: 'ring-diamond', kind: 'border', label: 'Diamond ring', price: 2000, limit: 50, blurb: 'Faceted, shimmering. 50 made.' },
  { key: 'ring-owner', kind: 'border', label: 'Commissioner ring', price: 0, ownerOnly: true, blurb: 'Owner exclusive, animated.' },

  // Profile banners
  { key: 'banner-field', kind: 'banner', label: 'Gridiron', price: 300, blurb: 'Yard lines on turf.' },
  { key: 'banner-court', kind: 'banner', label: 'Hardwood', price: 300, blurb: 'Court boards.' },
  { key: 'banner-diamond', kind: 'banner', label: 'Infield', price: 300, blurb: 'Clay and grass.' },
  { key: 'banner-night', kind: 'banner', label: 'Night game', price: 500, blurb: 'Stadium lights after dark.' },
  { key: 'banner-sunset', kind: 'banner', label: 'Golden hour', price: 500 },
  { key: 'banner-launch', kind: 'banner', label: 'Launch season', price: 1800, limit: 50, blurb: 'For the first 50. Never sold again.' },
  { key: 'banner-founder', kind: 'banner', label: 'Founder', price: 0, ownerOnly: true, blurb: 'Owner exclusive.' },

  // Titles (shown under your name on your profile and next to it on leaderboards)
  { key: 'rookie', kind: 'title', label: 'Rookie', price: 50 },
  { key: 'grinder', kind: 'title', label: 'Grinder', price: 200 },
  { key: 'sleeper', kind: 'title', label: 'Sleeper pick', price: 250 },
  { key: 'closer', kind: 'title', label: 'Closer', price: 300 },
  { key: 'film-room', kind: 'title', label: 'Film room', price: 350 },
  { key: 'goat-candidate', kind: 'title', label: 'GOAT candidate', price: 1000 },
  { key: 'day-one', kind: 'title', label: 'Day One', price: 1000, limit: 20, blurb: 'For the first 20. Never sold again.' },
  { key: 'commissioner', kind: 'title', label: 'Commissioner', price: 0, ownerOnly: true, blurb: 'Owner exclusive.' },

  // Leaderboard flair (a small mark before your name)
  { key: 'flair-star', kind: 'flair', label: 'Star', price: 200 },
  { key: 'flair-flame', kind: 'flair', label: 'Flame', price: 300 },
  { key: 'flair-bolt', kind: 'flair', label: 'Bolt', price: 300 },
  { key: 'flair-crown', kind: 'flair', label: 'Crown', price: 900 },
  { key: 'flair-diamond', kind: 'flair', label: 'Diamond', price: 1500, limit: 50, blurb: '50 made.' },
  { key: 'flair-owner', kind: 'flair', label: 'Owner badge', price: 0, ownerOnly: true, blurb: 'Owner exclusive.' },
];

export const shopItem = (key: string) => SHOP_ITEMS.find((i) => i.key === key);
export const itemsOf = (kind: ItemKind) => SHOP_ITEMS.filter((i) => i.kind === kind);
export const titleLabel = (key: string | null | undefined) => (key ? shopItem(key)?.label ?? null : null);

/** What a player has equipped beyond the name font and color. */
export interface Equipped { border?: string | null; banner?: string | null; title?: string | null; flair?: string | null }
