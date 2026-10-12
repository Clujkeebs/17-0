/**
 * The shop catalog. Points are earned by playing (see src/lib/server/points.ts) and spent here on cosmetics.
 * Points have no cash value and cannot be bought. Limited items have a fixed stock, first come first served.
 * Owner-only items are never for sale: only the owner account has them, decided on the server by email.
 */
export type ItemKind = 'font' | 'color' | 'border' | 'banner' | 'title' | 'flair' | 'effect';
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
  /** Gift only: never sold. Given to the players listed in GIFTS (or by the owner from /owner). */
  giftOnly?: boolean;
}

export const KIND_LABELS: Record<ItemKind, string> = {
  font: 'Name fonts', color: 'Name colors', border: 'Avatar borders', banner: 'Profile banners', title: 'Titles', flair: 'Leaderboard flair', effect: 'Effects',
};
export const KIND_ORDER: ItemKind[] = ['effect', 'color', 'font', 'border', 'banner', 'title', 'flair'];

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
  { key: 'slate', kind: 'color', label: 'Slate', price: 100 },
  { key: 'crimson', kind: 'color', label: 'Crimson', price: 150 },
  { key: 'cobalt', kind: 'color', label: 'Cobalt', price: 150 },
  { key: 'violet', kind: 'color', label: 'Violet', price: 200 },
  { key: 'copper', kind: 'color', label: 'Copper', price: 450, blurb: 'Burnished, warm metal.' },
  { key: 'mint', kind: 'color', label: 'Sea glass', price: 450, blurb: 'Deep green into teal.' },
  { key: 'platinum', kind: 'color', label: 'Platinum', price: 1000, blurb: 'Cool steel with a light that sweeps across.' },
  { key: 'magma', kind: 'color', label: 'Magma', price: 1100, blurb: 'Slow-moving molten red and orange.' },
  { key: 'holo', kind: 'color', label: 'Holo', price: 1400, blurb: 'Rookie-card refractor shine.' },
  { key: 'galaxy', kind: 'color', label: 'Galaxy', price: 2200, limit: 30, blurb: 'Deep space drift. 30 made.' },
  { key: 'owner-crown', kind: 'color', label: 'Crown jewels', price: 0, ownerOnly: true, blurb: 'Owner exclusive. Gold with a ruby glint.' },

  // Name fonts
  { key: 'varsity', kind: 'font', label: 'Varsity', price: 300, blurb: 'Slanted block letters.' },
  { key: 'ticker', kind: 'font', label: 'Ticker', price: 300, blurb: 'All caps, wide, like a bottom-line crawl.' },
  { key: 'locker', kind: 'font', label: 'Locker room', price: 400, blurb: 'Marker, slanted.' },
  { key: 'broadcast', kind: 'font', label: 'Broadcast', price: 600, blurb: 'Heavy italic, TV graphics style.' },
  { key: 'hall', kind: 'font', label: 'Hall of Fame', price: 1200, limit: 50, blurb: 'Engraved serif small caps. 50 made.' },
  { key: 'headline', kind: 'font', label: 'Headline', price: 250, blurb: 'Tall condensed caps, front-page style.' },
  { key: 'collegiate', kind: 'font', label: 'Collegiate', price: 350, blurb: 'Letterman-jacket block serif.' },
  { key: 'stencil', kind: 'font', label: 'Stencil', price: 400, blurb: 'Equipment-crate stencil.' },
  { key: 'comic', kind: 'font', label: 'Highlight reel', price: 450, blurb: 'Comic-book action caps.' },
  { key: 'western', kind: 'font', label: 'Rodeo', price: 500, blurb: 'Wanted-poster serif.' },
  { key: 'future', kind: 'font', label: 'Future', price: 650, blurb: 'Wide, clean, space age.' },
  { key: 'arcade', kind: 'font', label: 'Arcade', price: 800, blurb: 'Pixel caps from an 8-bit cabinet.' },
  { key: 'signature', kind: 'font', label: 'Autograph', price: 1500, limit: 50, blurb: 'Your name, signed. 50 made.' },

  // Avatar borders
  { key: 'ring-ink', kind: 'border', label: 'Ink ring', price: 100 },
  { key: 'ring-red', kind: 'border', label: 'Signal ring', price: 150 },
  { key: 'ring-turf', kind: 'border', label: 'Turf ring', price: 150 },
  { key: 'ring-gold', kind: 'border', label: 'Gold ring', price: 500 },
  { key: 'ring-gradient', kind: 'border', label: 'Spectrum ring', price: 800 },
  { key: 'ring-diamond', kind: 'border', label: 'Diamond ring', price: 2000, limit: 50, blurb: 'Faceted, shimmering. 50 made.' },
  { key: 'ring-owner', kind: 'border', label: 'Commissioner ring', price: 0, ownerOnly: true, blurb: 'Owner exclusive, animated.' },
  { key: 'ring-navy', kind: 'border', label: 'Navy ring', price: 150 },
  { key: 'ring-plum', kind: 'border', label: 'Plum ring', price: 150 },
  { key: 'ring-double', kind: 'border', label: 'Double stripe', price: 300, blurb: 'Two-tone sleeve stripes.' },
  { key: 'ring-laces', kind: 'border', label: 'Laces', price: 400, blurb: 'Leather brown with white laces.' },
  { key: 'ring-stitches', kind: 'border', label: 'Red stitches', price: 400, blurb: 'Baseball seams.' },
  { key: 'ring-ice', kind: 'border', label: 'Ice ring', price: 700, blurb: 'Frosted, with a glint that circles.' },
  { key: 'ring-flame', kind: 'border', label: 'On fire', price: 1100, blurb: 'Flickers like a heater.' },
  { key: 'ring-holo', kind: 'border', label: 'Holo ring', price: 2400, limit: 30, blurb: 'Refractor rainbow that turns. 30 made.' },
  { key: 'ring-owner-crown', kind: 'border', label: 'Crown ring', price: 0, ownerOnly: true, blurb: 'Owner exclusive. Gold and ruby, turning.' },

  // Profile banners
  { key: 'banner-field', kind: 'banner', label: 'Gridiron', price: 300, blurb: 'Yard lines on turf.' },
  { key: 'banner-court', kind: 'banner', label: 'Hardwood', price: 300, blurb: 'Court boards.' },
  { key: 'banner-diamond', kind: 'banner', label: 'Infield', price: 300, blurb: 'Clay and grass.' },
  { key: 'banner-night', kind: 'banner', label: 'Night game', price: 500, blurb: 'Stadium lights after dark.' },
  { key: 'banner-sunset', kind: 'banner', label: 'Golden hour', price: 500 },
  { key: 'banner-launch', kind: 'banner', label: 'Launch season', price: 1800, limit: 50, blurb: 'For the first 50. Never sold again.' },
  { key: 'banner-founder', kind: 'banner', label: 'Founder', price: 0, ownerOnly: true, blurb: 'Owner exclusive.' },
  { key: 'banner-endzone', kind: 'banner', label: 'End zone', price: 300, blurb: 'Painted diagonal stripes.' },
  { key: 'banner-snow', kind: 'banner', label: 'Snow game', price: 400, blurb: 'Late December, lake-effect snow.' },
  { key: 'banner-playbook', kind: 'banner', label: 'Playbook', price: 450, blurb: "X's and O's on the whiteboard." },
  { key: 'banner-jumbotron', kind: 'banner', label: 'Jumbotron', price: 600, blurb: 'LED dot matrix.' },
  { key: 'banner-retro', kind: 'banner', label: 'Throwback', price: 600, blurb: 'Eighties warm-up stripes.' },
  { key: 'banner-marble', kind: 'banner', label: 'Hall', price: 900, blurb: 'Marble and bronze.' },
  { key: 'banner-aurora', kind: 'banner', label: 'Northern lights', price: 1300, blurb: 'Slow, shifting sky.' },
  { key: 'banner-confetti', kind: 'banner', label: 'Parade', price: 2500, limit: 30, blurb: 'Championship confetti. 30 made.' },
  { key: 'banner-vault', kind: 'banner', label: 'Vault', price: 0, ownerOnly: true, blurb: 'Owner exclusive. Black, gold and ruby.' },

  // Titles (shown under your name on your profile and next to it on leaderboards)
  { key: 'rookie', kind: 'title', label: 'Rookie', price: 50 },
  { key: 'grinder', kind: 'title', label: 'Grinder', price: 200 },
  { key: 'sleeper', kind: 'title', label: 'Sleeper pick', price: 250 },
  { key: 'closer', kind: 'title', label: 'Closer', price: 300 },
  { key: 'film-room', kind: 'title', label: 'Film room', price: 350 },
  { key: 'goat-candidate', kind: 'title', label: 'GOAT candidate', price: 1000 },
  { key: 'day-one', kind: 'title', label: 'Day One', price: 1000, limit: 20, blurb: 'For the first 20. Never sold again.' },
  { key: 'commissioner', kind: 'title', label: 'Commissioner', price: 0, ownerOnly: true, blurb: 'Owner exclusive.' },
  { key: 'sixth-man', kind: 'title', label: 'Sixth man', price: 150 },
  { key: 'utility', kind: 'title', label: 'Utility player', price: 150 },
  { key: 'iron-man', kind: 'title', label: 'Iron man', price: 300 },
  { key: 'gm', kind: 'title', label: 'General manager', price: 400 },
  { key: 'walk-off', kind: 'title', label: 'Walk-off', price: 450 },
  { key: 'buzzer-beater', kind: 'title', label: 'Buzzer beater', price: 450 },
  { key: 'franchise', kind: 'title', label: 'Franchise player', price: 800 },
  { key: 'hall-of-famer', kind: 'title', label: 'Hall of Famer', price: 1600 },
  { key: 'mvp', kind: 'title', label: 'MVP', price: 3000, limit: 20, blurb: 'Only 20 will ever exist.' },
  { key: 'owner-title', kind: 'title', label: 'Owner', price: 0, ownerOnly: true, blurb: 'Owner exclusive.' },

  // Leaderboard flair (a small mark before your name)
  { key: 'flair-star', kind: 'flair', label: 'Star', price: 200 },
  { key: 'flair-flame', kind: 'flair', label: 'Flame', price: 300 },
  { key: 'flair-bolt', kind: 'flair', label: 'Bolt', price: 300 },
  { key: 'flair-crown', kind: 'flair', label: 'Crown', price: 900 },
  { key: 'flair-diamond', kind: 'flair', label: 'Diamond', price: 1500, limit: 50, blurb: '50 made.' },
  { key: 'flair-owner', kind: 'flair', label: 'Owner badge', price: 0, ownerOnly: true, blurb: 'Owner exclusive.' },
  { key: 'flair-football', kind: 'flair', label: 'Football', price: 150 },
  { key: 'flair-basketball', kind: 'flair', label: 'Basketball', price: 150 },
  { key: 'flair-baseball', kind: 'flair', label: 'Baseball', price: 150 },
  { key: 'flair-whistle', kind: 'flair', label: 'Whistle', price: 250 },
  { key: 'flair-snow', kind: 'flair', label: 'Ice cold', price: 350 },
  { key: 'flair-mic', kind: 'flair', label: 'Mic drop', price: 450 },
  { key: 'flair-trophy', kind: 'flair', label: 'Trophy', price: 1200 },
  { key: 'flair-ring', kind: 'flair', label: 'Title ring', price: 2000, limit: 30, blurb: '30 made.' },
  { key: 'flair-owner-key', kind: 'flair', label: 'Master key', price: 0, ownerOnly: true, blurb: 'Owner exclusive.' },
  // Effects: animated pieces that move around your avatar on your profile and beside your name on leaderboards.
  { key: 'fx-sparks', kind: 'effect', label: 'Sparks', price: 300, blurb: 'Three sparks circling your picture.' },
  { key: 'fx-football', kind: 'effect', label: 'Tight spiral', price: 450, blurb: 'A football orbiting, in a perfect spiral.' },
  { key: 'fx-basketball', kind: 'effect', label: 'Crossover', price: 450, blurb: 'A basketball circling, with a bounce.' },
  { key: 'fx-baseball', kind: 'effect', label: 'Heater', price: 450, blurb: 'A fastball with red seams on a loop.' },
  { key: 'fx-snow', kind: 'effect', label: 'Snow game', price: 600, blurb: 'Flakes drifting down past you.' },
  { key: 'fx-halo', kind: 'effect', label: 'Halo', price: 800, blurb: 'A ring of light turning above you.' },
  { key: 'fx-comet', kind: 'effect', label: 'Comet', price: 900, blurb: 'A glowing comet trailing fire around your picture.' },
  { key: 'fx-lightning', kind: 'effect', label: 'Storm', price: 1100, blurb: 'Lightning that cracks across now and then.' },
  { key: 'fx-flames', kind: 'effect', label: 'Heat check', price: 1400, blurb: 'Real flames licking up from behind you.' },
  { key: 'fx-confetti', kind: 'effect', label: 'Champion', price: 2400, limit: 30, blurb: 'Gold and red confetti that never stops. 30 made.' },
  { key: 'fx-owner', kind: 'effect', label: 'Crown orbit', price: 0, ownerOnly: true, blurb: 'Owner exclusive. A gold crown circling.' },

  // More name colors
  { key: 'ember', kind: 'color', label: 'Ember', price: 1200, blurb: 'Letters that burn: flickering orange and red with a glow.' },
  { key: 'neon-green', kind: 'color', label: 'Neon', price: 500, blurb: 'Electric green with a soft glow.' },
  { key: 'ocean', kind: 'color', label: 'Deep water', price: 450, blurb: 'Navy into teal, slowly rolling.' },
  { key: 'bubblegum', kind: 'color', label: 'Bubblegum', price: 350, blurb: 'Pink into purple.' },
  { key: 'midnight', kind: 'color', label: 'Midnight', price: 250 },
  { key: 'electric', kind: 'color', label: 'Electric', price: 1600, blurb: 'Blue current running through your name.' },

  // More borders
  { key: 'ring-lava', kind: 'border', label: 'Lava ring', price: 1300, blurb: 'Molten rock with flames that rise off it.' },
  { key: 'ring-electric', kind: 'border', label: 'Live wire', price: 1000, blurb: 'Blue current crackling around.' },
  { key: 'ring-camo', kind: 'border', label: 'Camo', price: 350, blurb: 'Salute to service colors.' },
  { key: 'ring-neon', kind: 'border', label: 'Neon sign', price: 600, blurb: 'Pink neon tube that hums on and off.' },

  // More banners
  { key: 'banner-inferno', kind: 'banner', label: 'Inferno', price: 1600, blurb: 'A wall of real-looking fire behind your name.' },
  { key: 'banner-stadium', kind: 'banner', label: 'Under the lights', price: 700, blurb: 'Light towers sweeping a packed stadium.' },
  { key: 'banner-ocean', kind: 'banner', label: 'Open water', price: 500, blurb: 'Rolling waves.' },
  { key: 'banner-city', kind: 'banner', label: 'Skyline', price: 650, blurb: 'A city at night, windows flickering on.' },

  // More titles
  { key: 'clutch', kind: 'title', label: 'Clutch', price: 200 },
  { key: 'hooper', kind: 'title', label: 'Hooper', price: 150 },
  { key: 'ace', kind: 'title', label: 'Ace', price: 250 },
  { key: 'ball-knower', kind: 'title', label: 'Ball knower', price: 300 },
  { key: 'cheat-code', kind: 'title', label: 'Cheat code', price: 700 },
  { key: 'underdog', kind: 'title', label: 'Underdog', price: 150 },
  { key: 'captain', kind: 'title', label: 'Captain', price: 500 },
  { key: 'dynasty', kind: 'title', label: 'Dynasty', price: 1400 },

  // More flair
  { key: 'flair-rocket', kind: 'flair', label: 'Rocket', price: 400 },
  { key: 'flair-target', kind: 'flair', label: 'Bullseye', price: 250 },
  { key: 'flair-goat', kind: 'flair', label: 'GOAT', price: 1600, blurb: 'For the ones who know.' },

  // Gifts: never sold. The B set (every slot) and a few pieces for friends of the site.
  { key: 'honeycomb', kind: 'color', label: 'Honeycomb', price: 0, giftOnly: true, blurb: 'Gift. Black and gold, dripping like honey.' },
  { key: 'buzz', kind: 'font', label: 'Buzz', price: 0, giftOnly: true, blurb: 'Gift. Bold stinger caps.' },
  { key: 'ring-hive', kind: 'border', label: 'Hive ring', price: 0, giftOnly: true, blurb: 'Gift. Honeycomb that turns.' },
  { key: 'banner-hive', kind: 'banner', label: 'The Hive', price: 0, giftOnly: true, blurb: 'Gift. Honeycomb with bees crossing.' },
  { key: 'b-team', kind: 'title', label: 'B Team', price: 0, giftOnly: true, blurb: 'Gift.' },
  { key: 'flair-bee', kind: 'flair', label: 'Bee', price: 0, giftOnly: true, blurb: 'Gift.' },
  { key: 'fx-bee', kind: 'effect', label: 'Busy bee', price: 0, giftOnly: true, blurb: 'Gift. A bee buzzing around you.' },

  // Third drop: the cosmetics redo. Metals and stones, display fonts, drawn frames, scenes and a lot more motion.
  // Name colors (each has a light and a dark palette in src/components/cosmetics.css)
  { key: 'silver', kind: 'color', label: 'Silver', price: 600, blurb: 'Brushed silver with a glint that passes through.' },
  { key: 'rosegold', kind: 'color', label: 'Rose gold', price: 800, blurb: 'Warm copper-pink metal.' },
  { key: 'emerald', kind: 'color', label: 'Emerald', price: 900, blurb: 'A cut green stone catching the light.' },
  { key: 'ruby', kind: 'color', label: 'Ruby', price: 900, blurb: 'A deep red stone catching the light.' },
  { key: 'sapphire', kind: 'color', label: 'Sapphire', price: 900, blurb: 'A royal blue stone catching the light.' },
  { key: 'amethyst', kind: 'color', label: 'Amethyst', price: 900, blurb: 'Purple crystal, glinting.' },
  { key: 'glacier', kind: 'color', label: 'Glacier', price: 1000, blurb: 'Pale ice with sharp glints.' },
  { key: 'obsidian', kind: 'color', label: 'Obsidian', price: 1300, blurb: 'Volcanic glass with a violet flash.' },
  { key: 'toxic', kind: 'color', label: 'Toxic', price: 500, blurb: 'Radioactive green, glowing.' },
  { key: 'neon-pink', kind: 'color', label: 'Neon pink', price: 500, blurb: 'A hot pink tube light.' },
  { key: 'sunrise', kind: 'color', label: 'Sunrise', price: 600, blurb: 'Amber into pink into indigo.' },
  { key: 'vapor', kind: 'color', label: 'Vapor', price: 700, blurb: 'Pink, violet and cyan, drifting.' },
  { key: 'royal', kind: 'color', label: 'Royal', price: 1100, blurb: 'Purple and gold with a slow shimmer.' },
  { key: 'cyber', kind: 'color', label: 'Cyber', price: 1200, blurb: 'Cyan and magenta split, glitching now and then.' },
  { key: 'prism', kind: 'color', label: 'Prism', price: 1300, blurb: 'Every color, turning like a lens.' },
  { key: 'wildfire', kind: 'color', label: 'Wildfire', price: 1800, limit: 25, blurb: 'Hotter than Ember. Flames climb every letter. 25 made.' },

  // Name fonts
  { key: 'typewriter', kind: 'font', label: 'Typewriter', price: 300, blurb: 'Press box, ink on paper.' },
  { key: 'extrude', kind: 'font', label: 'Extrude', price: 350, blurb: 'Block capitals with a hard stepped shadow.' },
  { key: 'bubble', kind: 'font', label: 'Bubble', price: 400, blurb: 'Round, fat and friendly.' },
  { key: 'outline', kind: 'font', label: 'Outline', price: 450, blurb: 'Tall caps with a clean sticker edge.' },
  { key: 'emboss', kind: 'font', label: 'Embossed', price: 500, blurb: 'Serif letters pressed into the page.' },
  { key: 'graffiti', kind: 'font', label: 'Tagged', price: 650, blurb: 'Spray-can caps, thrown on a wall.' },
  { key: 'tube', kind: 'font', label: 'Marquee', price: 700, blurb: 'Display letters that glow like a sign.' },
  { key: 'glitch', kind: 'font', label: 'Glitch', price: 900, blurb: 'Mono caps with a split red and cyan signal.' },

  // Avatar frames: drawn borders that sit over your picture
  { key: 'ring-pixel', kind: 'border', label: 'Pixel', price: 600, blurb: 'An 8-bit border in bright blocks.' },
  { key: 'ring-chain', kind: 'border', label: 'Chain', price: 600, blurb: 'Polished steel links.' },
  { key: 'ring-spikes', kind: 'border', label: 'Spikes', price: 700, blurb: 'Studded steel.' },
  { key: 'ring-thorns', kind: 'border', label: 'Briar', price: 700, blurb: 'Thorned vine with red roses.' },
  { key: 'ring-reel', kind: 'border', label: 'Film reel', price: 800, blurb: 'Sprocket holes, like game film.' },
  { key: 'ring-laurel-silver', kind: 'border', label: 'Silver laurel', price: 1000, blurb: 'The runner-up wreath, in silver.' },
  { key: 'ring-circuit', kind: 'border', label: 'Circuit', price: 1000, blurb: 'Traces and pads, powered on.' },
  { key: 'ring-frost', kind: 'border', label: 'Frostbite', price: 1100, blurb: 'Ice crystals growing off the ring.' },
  { key: 'ring-rays', kind: 'border', label: 'Sunburst', price: 1400, blurb: 'Gold rays all the way around.' },
  { key: 'ring-allstar', kind: 'border', label: 'All-star', price: 1400, blurb: 'Stars on a blue band.' },
  { key: 'ring-laurel', kind: 'border', label: 'Laurel', price: 1500, blurb: 'A gold wreath for a champion.' },
  { key: 'ring-gems', kind: 'border', label: 'Jeweled', price: 1800, limit: 40, blurb: 'A gold band set with four gems. 40 made.' },
  { key: 'ring-cup', kind: 'border', label: 'Championship cup', price: 2200, limit: 25, blurb: 'A trophy with handles and a base. 25 made.' },
  { key: 'ring-crown', kind: 'border', label: 'Crowned', price: 3000, limit: 20, blurb: 'A gold ring wearing a crown. 20 made.' },

  // Profile banners: full scenes, most of them moving
  { key: 'banner-pitch', kind: 'banner', label: 'Matchday', price: 400, blurb: 'A pitch at dusk under floodlights.' },
  { key: 'banner-rink', kind: 'banner', label: 'Center ice', price: 400, blurb: 'Faceoff circles and fresh skate marks.' },
  { key: 'banner-ballpark', kind: 'banner', label: 'Ballpark', price: 500, blurb: 'An evening game: light towers and fireworks.' },
  { key: 'banner-rain', kind: 'banner', label: 'Rain game', price: 500, blurb: 'Floodlights and a downpour.' },
  { key: 'banner-draft', kind: 'banner', label: 'Draft night', price: 600, blurb: 'The stage, the lights, the crowd.' },
  { key: 'banner-sakura', kind: 'banner', label: 'Blossom', price: 600, blurb: 'A pale dawn and drifting petals.' },
  { key: 'banner-scoreboard', kind: 'banner', label: 'Scoreboard', price: 600, blurb: 'Amber bulbs reading 17 to 0.' },
  { key: 'banner-tunnel', kind: 'banner', label: 'The tunnel', price: 700, blurb: 'The walk out, with the field bright at the end.' },
  { key: 'banner-comic', kind: 'banner', label: 'Comic', price: 700, blurb: 'Halftone dots, speed lines and a POW.' },
  { key: 'banner-summit', kind: 'banner', label: 'Summit', price: 700, blurb: 'Peaks at dawn with a flag on top.' },
  { key: 'banner-circuit', kind: 'banner', label: 'Circuit', price: 800, blurb: 'Light pulses travelling along the traces.' },
  { key: 'banner-pixelcity', kind: 'banner', label: 'Pixel city', price: 800, blurb: 'An 8-bit skyline with drifting clouds.' },
  { key: 'banner-synthwave', kind: 'banner', label: 'Synthwave', price: 900, blurb: 'A banded sun over a neon grid.' },
  { key: 'banner-matrix', kind: 'banner', label: 'Green rain', price: 900, blurb: 'Code falling in the dark.' },
  { key: 'banner-trophy', kind: 'banner', label: 'Trophy room', price: 1200, blurb: 'Gold under spotlights.' },
  { key: 'banner-galaxy', kind: 'banner', label: 'Galaxy', price: 1400, blurb: 'Nebula, a ringed planet and a shooting star.' },
  { key: 'banner-hologram', kind: 'banner', label: 'Hologram', price: 1500, blurb: 'Foil with a diffraction sweep.' },
  { key: 'banner-gilded', kind: 'banner', label: 'Gilded', price: 2000, limit: 30, blurb: 'Art deco gold on black. 30 made.' },

  // Titles
  { key: 'walk-on', kind: 'title', label: 'Walk-on', price: 50 },
  { key: 'role-player', kind: 'title', label: 'Role player', price: 100 },
  { key: 'prospect', kind: 'title', label: 'Prospect', price: 200 },
  { key: 'two-way', kind: 'title', label: 'Two-way', price: 250 },
  { key: 'scout', kind: 'title', label: 'Scout', price: 250 },
  { key: 'lockdown', kind: 'title', label: 'Lockdown', price: 300 },
  { key: 'heater', kind: 'title', label: 'On a heater', price: 350 },
  { key: 'veteran', kind: 'title', label: 'Veteran', price: 400 },
  { key: 'all-pro', kind: 'title', label: 'All-Pro', price: 900 },
  { key: 'all-star', kind: 'title', label: 'All-Star', price: 900 },
  { key: 'triple-double', kind: 'title', label: 'Triple-double', price: 1200 },
  { key: 'perfect-game', kind: 'title', label: 'Perfect game', price: 1800 },
  { key: 'ring-bearer', kind: 'title', label: 'Ring bearer', price: 2000, limit: 30, blurb: '30 made.' },
  { key: 'undefeated', kind: 'title', label: 'Undefeated', price: 2500, limit: 17, blurb: 'Only 17 will ever exist.' },

  // Leaderboard flair
  { key: 'flair-soccer', kind: 'flair', label: 'Soccer ball', price: 150 },
  { key: 'flair-heart', kind: 'flair', label: 'Heart', price: 200 },
  { key: 'flair-hockey', kind: 'flair', label: 'Hockey stick', price: 200 },
  { key: 'flair-helmet', kind: 'flair', label: 'Helmet', price: 250 },
  { key: 'flair-glove', kind: 'flair', label: 'Glove', price: 250 },
  { key: 'flair-clover', kind: 'flair', label: 'Lucky', price: 300 },
  { key: 'flair-jersey', kind: 'flair', label: 'Jersey', price: 350 },
  { key: 'flair-megaphone', kind: 'flair', label: 'Megaphone', price: 350 },
  { key: 'flair-scoreboard', kind: 'flair', label: 'Scoreboard', price: 450 },
  { key: 'flair-medal', kind: 'flair', label: 'Medal', price: 600 },
  { key: 'flair-comet', kind: 'flair', label: 'Comet', price: 700 },
  { key: 'flair-laurel', kind: 'flair', label: 'Laurel', price: 900 },

  // Effects: art that moves around your picture
  { key: 'fx-bubbles', kind: 'effect', label: 'Bubbles', price: 400, blurb: 'Soap bubbles rising past you.' },
  { key: 'fx-soccer', kind: 'effect', label: 'Free kick', price: 450, blurb: 'A soccer ball bouncing around you.' },
  { key: 'fx-hockey', kind: 'effect', label: 'Slap shot', price: 450, blurb: 'A puck circling in a spray of ice.' },
  { key: 'fx-hearts', kind: 'effect', label: 'Fan favorite', price: 500, blurb: 'Hearts floating up around you.' },
  { key: 'fx-stars', kind: 'effect', label: 'Starfield', price: 600, blurb: 'Twinkling stars of every size.' },
  { key: 'fx-rain', kind: 'effect', label: 'Rain delay', price: 600, blurb: 'Your own cloud, and rain.' },
  { key: 'fx-coins', kind: 'effect', label: 'Coin toss', price: 700, blurb: 'Gold coins spinning around you.' },
  { key: 'fx-fireflies', kind: 'effect', label: 'Fireflies', price: 700, blurb: 'Soft green lights drifting by.' },
  { key: 'fx-sakura', kind: 'effect', label: 'Blossom', price: 800, blurb: 'Petals drifting down.' },
  { key: 'fx-embers', kind: 'effect', label: 'Embers', price: 900, blurb: 'Hot sparks rising off you.' },
  { key: 'fx-gyro', kind: 'effect', label: 'Gyroscope', price: 1000, blurb: 'Three glowing rings in orbit.' },
  { key: 'fx-glitch', kind: 'effect', label: 'Glitch', price: 1100, blurb: 'Your picture splits into red and cyan.' },
  { key: 'fx-shockwave', kind: 'effect', label: 'Shockwave', price: 1200, blurb: 'A pulse that rings out from you.' },
  { key: 'fx-aura-blue', kind: 'effect', label: 'Blue aura', price: 1400, blurb: 'A cold blue flame of light behind you.' },
  { key: 'fx-aura-violet', kind: 'effect', label: 'Violet aura', price: 1400, blurb: 'A violet haze, burning slowly.' },
  { key: 'fx-electric', kind: 'effect', label: 'Arc', price: 1500, blurb: 'Electric arcs crawling the edge of your picture.' },
  { key: 'fx-fireworks', kind: 'effect', label: 'Fireworks', price: 1800, blurb: 'Bursts going off around your picture.' },
  { key: 'fx-aura-gold', kind: 'effect', label: 'Gold aura', price: 2000, blurb: 'A golden flame of light behind you.' },
  { key: 'fx-wings', kind: 'effect', label: 'Wings', price: 2600, limit: 25, blurb: 'White wings spread behind you. 25 made.' },
];

/** The B set: one of everything. */
export const B_SET = ['honeycomb', 'buzz', 'ring-hive', 'banner-hive', 'b-team', 'flair-bee', 'fx-bee'];
/**
 * Gifts by username (compared without case, spaces or punctuation, so "B-Man" and "bman" match).
 * Gifted items are owned outright; the owner can also give any gift from /owner.
 */
export const GIFTS: Record<string, { items: string[]; note: string }> = {
  bees: { items: B_SET, note: 'The B set: a color, font, ring, banner, title, flair and a bee that follows you around.' },
  bman: { items: B_SET, note: 'The B set: a color, font, ring, banner, title, flair and a bee that follows you around.' },
  bot: { items: ['chrome', 'ring-ice', 'flair-bolt', 'fx-sparks'], note: 'Chrome name, Ice ring, Bolt flair and Sparks.' },
};
export const giftKey = (username: string | null | undefined) => (username ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
export const giftsFor = (username: string | null | undefined) => GIFTS[giftKey(username)] ?? null;

export const shopItem = (key: string) => SHOP_ITEMS.find((i) => i.key === key);
export const itemsOf = (kind: ItemKind) => SHOP_ITEMS.filter((i) => i.kind === kind);
export const titleLabel = (key: string | null | undefined) => (key ? shopItem(key)?.label ?? null : null);

/** Rarity, from how an item is sold: owner exclusives, limited runs, then by price. Drives the card and title styling. */
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary' | 'limited' | 'exclusive' | 'gift';
export const RARITY_LABEL: Record<Rarity, string> = { common: 'Common', rare: 'Rare', epic: 'Epic', legendary: 'Legendary', limited: 'Limited', exclusive: 'Owner exclusive', gift: 'Gift' };
export function rarity(i: ShopItem): Rarity {
  if (i.ownerOnly) return 'exclusive';
  if (i.giftOnly) return 'gift';
  if (i.limit) return 'limited';
  return i.price >= 1500 ? 'legendary' : i.price >= 700 ? 'epic' : i.price >= 300 ? 'rare' : 'common';
}
/** Title pills take their item's rarity, so a bought MVP looks like one. */
export const titleRarity = (key: string | null | undefined) => { const i = key ? shopItem(key) : undefined; return i ? rarity(i) : null; };

/** What a player has equipped beyond the name font and color. */
export interface Equipped { border?: string | null; banner?: string | null; title?: string | null; flair?: string | null; effect?: string | null }
