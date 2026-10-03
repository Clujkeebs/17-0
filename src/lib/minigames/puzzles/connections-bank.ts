/**
 * Sports Connections category bank. Every puzzle takes one category per level (0 easiest, 3 trickiest, usually
 * wordplay) and four items from each. Items are written exactly as they appear on a tile. Facts here are stable
 * (champions are for closed seasons, numbers are retired or long-held), and a puzzle never uses a tile that is
 * listed in two of its categories, so every board has one answer.
 *
 * To add a category: label as it should read when solved, a level, and at least four items (more = more variety).
 */
export interface Category { label: string; level: 0 | 1 | 2 | 3; items: string[] }

export const BANK: Category[] = [
  /* ---------- Level 0: straightforward ---------- */
  { level: 0, label: 'NFL teams named for birds', items: ['Cardinals', 'Falcons', 'Ravens', 'Eagles', 'Seahawks'] },
  { level: 0, label: 'NBA teams in California', items: ['Lakers', 'Clippers', 'Warriors', 'Kings'] },
  { level: 0, label: 'NHL Original Six', items: ['Bruins', 'Canadiens', 'Red Wings', 'Blackhawks', 'Rangers', 'Maple Leafs'] },
  { level: 0, label: 'Tennis Grand Slams', items: ['Wimbledon', 'US Open', 'French Open', 'Australian Open'] },
  { level: 0, label: "Men's golf majors", items: ['Masters', 'PGA', 'US Open', 'The Open'] },
  { level: 0, label: 'Premier League "Big Six"', items: ['Arsenal', 'Chelsea', 'Liverpool', 'Man City', 'Man United', 'Tottenham'] },
  { level: 0, label: "Men's World Cup winners", items: ['Brazil', 'Germany', 'Italy', 'Argentina', 'France', 'Uruguay', 'Spain', 'England'] },
  { level: 0, label: 'Olympic swimming strokes', items: ['Freestyle', 'Backstroke', 'Breaststroke', 'Butterfly'] },
  { level: 0, label: 'Track and field throws', items: ['Shot put', 'Discus', 'Javelin', 'Hammer'] },
  { level: 0, label: 'Golf clubs', items: ['Driver', 'Wedge', 'Putter', 'Iron', 'Hybrid'] },
  { level: 0, label: 'Sports apparel brands', items: ['Nike', 'Adidas', 'Puma', 'Under Armour', 'Reebok', 'New Balance'] },
  { level: 0, label: 'Chicago teams', items: ['Bears', 'Bulls', 'Cubs', 'White Sox', 'Blackhawks', 'Fire', 'Sky'] },
  { level: 0, label: 'Boston-area teams', items: ['Celtics', 'Bruins', 'Red Sox', 'Patriots', 'Revolution'] },
  { level: 0, label: 'Detroit teams', items: ['Lions', 'Tigers', 'Pistons', 'Red Wings'] },
  { level: 0, label: 'Seattle teams', items: ['Seahawks', 'Mariners', 'Kraken', 'Storm', 'Sounders'] },
  { level: 0, label: 'New York teams', items: ['Yankees', 'Mets', 'Knicks', 'Islanders', 'Liberty', 'Jets'] },
  { level: 0, label: 'Big cats', items: ['Lions', 'Tigers', 'Jaguars', 'Panthers', 'Bengals'] },
  { level: 0, label: 'Racket sports', items: ['Tennis', 'Squash', 'Badminton', 'Pickleball', 'Padel', 'Racquetball'] },
  { level: 0, label: 'Baseball pitches', items: ['Slider', 'Curveball', 'Changeup', 'Knuckleball', 'Sinker', 'Splitter', 'Cutter'] },
  { level: 0, label: 'Bowling terms', items: ['Strike', 'Spare', 'Gutter', 'Split', 'Turkey'] },
  { level: 0, label: 'Formula 1 teams', items: ['Ferrari', 'McLaren', 'Mercedes', 'Red Bull', 'Williams', 'Haas'] },
  { level: 0, label: 'Sports video game series', items: ['Madden', 'NBA 2K', 'MLB The Show', 'FIFA', 'Tony Hawk', 'Fight Night'] },
  { level: 0, label: 'Teams with "Red" in the name', items: ['Red Sox', 'Red Wings', 'Reds', 'Red Bulls'] },
  { level: 0, label: 'Skateboard tricks', items: ['Ollie', 'Kickflip', 'Heelflip', 'Grind', 'Manual'] },
  { level: 0, label: 'Basketball moves', items: ['Crossover', 'Euro step', 'Alley-oop', 'Fadeaway', 'Skyhook'] },
  { level: 0, label: 'Esports games', items: ['League of Legends', 'Valorant', 'Counter-Strike', 'Dota', 'Fortnite', 'Rocket League'] },

  /* ---------- Level 1: a little knowledge ---------- */
  { level: 1, label: 'NFL franchises that moved cities', items: ['Rams', 'Raiders', 'Chargers', 'Colts', 'Cardinals', 'Titans'] },
  { level: 1, label: 'NBA franchises that relocated', items: ['Thunder', 'Grizzlies', 'Jazz', 'Kings', 'Clippers'] },
  { level: 1, label: 'NFL play-by-play voices', items: ['Nantz', 'Buck', 'Michaels', 'Tirico', 'Burkhardt'] },
  { level: 1, label: 'NFL TV analysts', items: ['Romo', 'Collinsworth', 'Aikman', 'Brady', 'Olsen'] },
  { level: 1, label: 'Legendary baseball broadcasters', items: ['Vin Scully', 'Harry Caray', 'Bob Uecker', 'Ernie Harwell', 'Jack Buck'] },
  { level: 1, label: '"Inside the NBA" crew', items: ['Ernie', 'Kenny', 'Shaq', 'Chuck'] },
  { level: 1, label: 'ESPN shows', items: ['SportsCenter', 'First Take', 'Around the Horn', 'Get Up', 'NFL Live', 'PTI'] },
  { level: 1, label: 'Football movies', items: ['Rudy', 'Remember the Titans', 'The Blind Side', 'Any Given Sunday', 'The Longest Yard', 'Invincible'] },
  { level: 1, label: 'Basketball movies', items: ['Hoosiers', 'Space Jam', 'Coach Carter', 'He Got Game', 'Blue Chips', 'Hustle'] },
  { level: 1, label: 'Baseball movies', items: ['Moneyball', 'The Sandlot', 'Field of Dreams', 'Major League', 'Bull Durham', '42'] },
  { level: 1, label: 'Hockey movies', items: ['Miracle', 'Slap Shot', 'The Mighty Ducks', 'Goon', 'Youngblood'] },
  { level: 1, label: 'Boxing movies', items: ['Rocky', 'Raging Bull', 'Creed', 'Million Dollar Baby', 'Cinderella Man', 'The Fighter'] },
  { level: 1, label: 'Scripted sports TV shows', items: ['Ted Lasso', 'Friday Night Lights', 'Ballers', 'Blue Mountain State', 'The League', 'Eastbound & Down'] },
  { level: 1, label: 'Sports docuseries', items: ['The Last Dance', 'Hard Knocks', 'Last Chance U', 'Drive to Survive', 'Full Swing', 'Quarterback'] },
  { level: 1, label: 'NFL running back nicknames', items: ['The Bus', 'Beast Mode', 'Sweetness', 'The Juice'] },
  { level: 1, label: 'NBA "The ___" nicknames', items: ['The Answer', 'The Mailman', 'The Dream', 'The Admiral', 'The Glove', 'The Truth'] },
  { level: 1, label: 'Team mascots', items: ['Phillie Phanatic', 'Mr. Met', 'Benny the Bull', 'Gritty', 'Youppi!'] },
  { level: 1, label: 'Ivy League schools', items: ['Harvard', 'Yale', 'Princeton', 'Columbia', 'Brown', 'Dartmouth', 'Cornell', 'Penn'] },
  { level: 1, label: 'College Wildcats', items: ['Kentucky', 'Arizona', 'Kansas State', 'Villanova', 'Northwestern'] },
  { level: 1, label: 'College Bulldogs', items: ['Georgia', 'Mississippi State', 'Gonzaga', 'Butler', 'Fresno State'] },
  { level: 1, label: 'College Tigers', items: ['LSU', 'Clemson', 'Auburn', 'Missouri', 'Memphis'] },
  { level: 1, label: 'College basketball blue bloods', items: ['Duke', 'Kentucky', 'Kansas', 'North Carolina', 'UCLA', 'Indiana'] },
  { level: 1, label: 'Championship trophies', items: ['Lombardi', "Larry O'Brien", 'Stanley Cup', "Commissioner's", 'Claret Jug'] },
  { level: 1, label: 'Won Super Bowls LIV to LIX', items: ['Chiefs', 'Buccaneers', 'Rams', 'Eagles'] },
  { level: 1, label: 'NBA champions 2016 to 2024', items: ['Cavaliers', 'Warriors', 'Raptors', 'Lakers', 'Bucks', 'Nuggets', 'Celtics'] },
  { level: 1, label: 'World Series champions 2020 to 2023', items: ['Dodgers', 'Braves', 'Astros', 'Rangers'] },
  { level: 1, label: 'Stanley Cup champions 2020 to 2024', items: ['Lightning', 'Avalanche', 'Golden Knights', 'Panthers'] },
  { level: 1, label: "Ballon d'Or winners", items: ['Messi', 'Ronaldo', 'Modric', 'Benzema', 'Rodri'] },
  { level: 1, label: "Cristiano Ronaldo's clubs", items: ['Sporting', 'Man United', 'Real Madrid', 'Juventus', 'Al Nassr'] },
  { level: 1, label: 'Premier League grounds', items: ['Anfield', 'Old Trafford', 'Stamford Bridge', 'Etihad', 'Emirates'] },
  { level: 1, label: 'Men\'s golf major winners', items: ['Woods', 'Mickelson', 'McIlroy', 'Scheffler', 'Koepka', 'Spieth'] },
  { level: 1, label: '20+ Grand Slam singles titles', items: ['Federer', 'Nadal', 'Djokovic', 'Serena', 'Graf', 'Court'] },
  { level: 1, label: 'Olympic swimmers', items: ['Phelps', 'Ledecky', 'Spitz', 'Lochte', 'Dressel'] },
  { level: 1, label: 'Olympic gymnasts', items: ['Biles', 'Comaneci', 'Retton', 'Douglas', 'Raisman'] },
  { level: 1, label: 'Olympic sprinters', items: ['Bolt', 'Lewis', 'Owens', 'Griffith-Joyner', 'Lyles'] },
  { level: 1, label: 'Boxing greats', items: ['Ali', 'Tyson', 'Mayweather', 'Pacquiao', 'Frazier', 'Foreman'] },
  { level: 1, label: 'NASCAR drivers', items: ['Earnhardt', 'Gordon', 'Petty', 'Busch', 'Elliott'] },
  { level: 1, label: 'Winter Olympians', items: ['Shaun White', 'Chloe Kim', 'Lindsey Vonn', 'Mikaela Shiffrin', 'Bode Miller'] },
  { level: 1, label: 'Figure skaters', items: ['Kristi Yamaguchi', 'Michelle Kwan', 'Nathan Chen', 'Scott Hamilton', 'Tonya Harding'] },
  { level: 1, label: 'Triple Crown winning horses', items: ['Secretariat', 'Seattle Slew', 'Affirmed', 'American Pharoah', 'Justify', 'Citation'] },
  { level: 1, label: 'Fantasy football terms', items: ['Waiver', 'Flex', 'PPR', 'Handcuff', 'Bye', 'Sleeper'] },
  { level: 1, label: 'Signature sneakers', items: ['Jordan', 'Kobe', 'LeBron', 'KD', 'Kyrie', 'Curry'] },
  { level: 1, label: 'Soccer positions', items: ['Striker', 'Winger', 'Sweeper', 'Keeper', 'Libero'] },
  { level: 1, label: 'Legendary coaches', items: ['Belichick', 'Saban', 'Popovich', 'Krzyzewski', 'Wooden', 'Shula'] },
  { level: 1, label: 'Heisman winners', items: ['Tebow', 'Newton', 'Manziel', 'Mariota', 'Burrow', 'Hunter'] },
  { level: 1, label: 'No. 1 overall NBA picks', items: ['Wembanyama', 'Banchero', 'Cunningham', 'Williamson', 'Edwards'] },
  { level: 1, label: 'No. 1 overall NFL picks', items: ['Burrow', 'Lawrence', 'Mayfield', 'Murray', 'Young'] },
  { level: 1, label: 'Japanese MLB stars', items: ['Ohtani', 'Ichiro', 'Matsui', 'Darvish', 'Yamamoto', 'Nomo'] },
  { level: 1, label: '600+ career home runs', items: ['Bonds', 'Aaron', 'Ruth', 'Mays', 'Griffey', 'Thome'] },
  { level: 1, label: '1992 Dream Team', items: ['Bird', 'Barkley', 'Ewing', 'Pippen', 'Stockton', 'Mullin', 'Drexler', 'Laettner'] },
  { level: 1, label: 'WNBA stars', items: ['Caitlin Clark', "A'ja Wilson", 'Breanna Stewart', 'Sabrina Ionescu', 'Diana Taurasi', 'Angel Reese'] },
  { level: 1, label: 'USWNT legends', items: ['Rapinoe', 'Morgan', 'Hamm', 'Lloyd', 'Wambach'] },
  { level: 1, label: 'Super Bowl halftime headliners', items: ['Rihanna', 'Usher', 'Kendrick Lamar', 'The Weeknd', 'Prince', 'Beyoncé'] },
  { level: 1, label: 'Famous NFL plays', items: ['Immaculate Reception', 'The Catch', 'Music City Miracle', 'Helmet Catch', 'Minneapolis Miracle', 'Butt Fumble'] },
  { level: 1, label: 'Named football plays', items: ['Hail Mary', 'Flea Flicker', 'Statue of Liberty', 'Philly Special', 'Fumblerooski'] },
  { level: 1, label: 'X Games stars', items: ['Tony Hawk', 'Travis Pastrana', 'Nyjah Huston', 'Shaun White', 'Chloe Kim'] },
  { level: 1, label: 'College stadium nicknames', items: ['The Big House', 'The Swamp', 'The Horseshoe', 'Death Valley', 'Happy Valley'] },
  { level: 1, label: 'City nicknames', items: ['Windy City', 'Motor City', 'Beantown', 'Mile High', 'Big Easy'] },
  { level: 1, label: 'Space-themed team names', items: ['Rockets', 'Astros', 'Galaxy', 'Mercury', 'Stars', 'Sun'] },
  { level: 1, label: 'Purple teams', items: ['Lakers', 'Vikings', 'Ravens', 'Rockies', 'Suns'] },
  { level: 1, label: 'Sports families', items: ['Manning', 'Kelce', 'Watt', 'Ball', 'Harbaugh'] },
  { level: 1, label: 'Hockey legends', items: ['Gretzky', 'Lemieux', 'Orr', 'Howe', 'Crosby', 'Ovechkin'] },

  /* ---------- Level 2: harder links ---------- */
  { level: 2, label: 'Wore No. 23', items: ['Michael Jordan', 'LeBron James', 'David Beckham', 'Draymond Green'] },
  { level: 2, label: 'Wore No. 99', items: ['Wayne Gretzky', 'Aaron Judge', 'J.J. Watt', 'Aaron Donald'] },
  { level: 2, label: 'Wore No. 12', items: ['Tom Brady', 'Aaron Rodgers', 'Joe Namath', 'Roger Staubach', 'Terry Bradshaw', 'Jim Kelly'] },
  { level: 2, label: 'Wore No. 3', items: ['Babe Ruth', 'Allen Iverson', 'Dwyane Wade', 'Dale Earnhardt'] },
  { level: 2, label: 'Wore No. 42', items: ['Jackie Robinson', 'Mariano Rivera', 'James Worthy', 'Al Horford'] },
  { level: 2, label: 'Golf scores under par', items: ['Birdie', 'Eagle', 'Albatross', 'Condor'] },
  { level: 2, label: 'Team names that do not end in S', items: ['Heat', 'Magic', 'Jazz', 'Thunder', 'Wild', 'Lightning', 'Avalanche', 'Kraken'] },
  { level: 2, label: 'Weather team names', items: ['Heat', 'Thunder', 'Lightning', 'Hurricanes', 'Avalanche', 'Storm'] },
  { level: 2, label: 'Teams named for jobs', items: ['Packers', 'Steelers', 'Brewers', 'Padres', 'Mariners', 'Cowboys'] },
  { level: 2, label: 'Black and gold teams', items: ['Steelers', 'Pirates', 'Penguins', 'Bruins', 'Saints'] },
  { level: 2, label: 'Teams with religious names', items: ['Saints', 'Padres', 'Angels', 'Friars', 'Demon Deacons'] },
  { level: 2, label: 'Royal team names', items: ['Kings', 'Royals', 'Knights', 'Monarchs'] },
  { level: 2, label: 'Golden ___', items: ['Knights', 'State', 'Bears', 'Gophers'] },
  { level: 2, label: 'Male animals as team names', items: ['Bucks', 'Rams', 'Bulls', 'Colts'] },
  { level: 2, label: 'New Year\'s Six bowls', items: ['Rose', 'Sugar', 'Orange', 'Cotton', 'Fiesta', 'Peach'] },
  { level: 2, label: '___ Cup', items: ['Stanley', 'World', 'Ryder', 'Davis', "America's", 'Gold'] },
  { level: 2, label: 'Awards named for people', items: ['Heisman', 'Cy Young', 'Vezina', 'Naismith', 'Hart', 'Calder'] },
  { level: 2, label: 'NHL awards', items: ['Hart', 'Vezina', 'Norris', 'Calder', 'Selke', 'Conn Smythe'] },
  { level: 2, label: 'Tennis scoring words', items: ['Love', 'Deuce', 'Advantage', 'Tiebreak', 'Break'] },
  { level: 2, label: 'Cricket terms', items: ['Wicket', 'Over', 'Bowler', 'Innings', 'Century', 'Duck'] },
  { level: 2, label: 'Soccer skills', items: ['Nutmeg', 'Rabona', 'Panenka', 'Cruyff turn', 'Bicycle kick'] },
  { level: 2, label: 'Fictional athletes', items: ['Happy Gilmore', 'Ricky Bobby', 'Roy Hobbs', 'Bobby Boucher', 'Benny Rodriguez'] },
  { level: 2, label: 'Fictional coaches', items: ['Ted Lasso', 'Eric Taylor', 'Gordon Bombay', 'Morris Buttermaker', 'Norman Dale'] },
  { level: 2, label: 'Fictional teams', items: ['Mighty Ducks', 'Bad News Bears', 'AFC Richmond', 'Dillon Panthers', 'Miami Sharks'] },
  { level: 2, label: 'Game-day jobs', items: ['Usher', 'Vendor', 'Umpire', 'Linesman', 'Ball boy'] },
  { level: 2, label: 'Famous golf courses', items: ['Augusta', 'St Andrews', 'Pebble Beach', 'Pinehurst', 'Oakmont'] },
  { level: 2, label: 'Wimbledon traditions', items: ['Strawberries', 'Grass', 'All-white', "Pimm's", 'Royal Box'] },
  { level: 2, label: 'Masters traditions', items: ['Green Jacket', 'Amen Corner', 'Pimento cheese', 'Butler Cabin', 'Par 3 Contest'] },
  { level: 2, label: 'College football rivalries', items: ['Iron Bowl', 'Egg Bowl', 'Red River', 'Backyard Brawl', 'Holy War'] },
  { level: 2, label: 'Basketball stars with movie roles', items: ['Jordan', 'LeBron', 'Shaq', 'Kareem', 'Garnett'] },
  { level: 2, label: 'Non-US-born NBA MVPs', items: ['Nowitzki', 'Antetokounmpo', 'Jokic', 'Embiid', 'Olajuwon'] },
  { level: 2, label: 'Canadian NBA stars', items: ['Nash', 'Wiggins', 'Gilgeous-Alexander', 'Murray', 'Barrett'] },
  { level: 2, label: 'Last names that are colors', items: ['Draymond Green', 'Jaylen Brown', 'Reggie White', 'Sonny Gray'] },
  { level: 2, label: 'Team owners, past or present', items: ['Kraft', 'Ballmer', 'Cuban', 'Jones'] },
  { level: 2, label: 'Pittsburgh teams', items: ['Steelers', 'Pirates', 'Penguins', 'Panthers'] },

  /* ---------- Level 3: wordplay and red herrings ---------- */
  { level: 3, label: 'Sports words for zero', items: ['Love', 'Duck', 'Nil', 'Bagel', 'Goose egg'] },
  { level: 3, label: 'Scoring terms that are birds', items: ['Turkey', 'Birdie', 'Eagle', 'Albatross', 'Duck'] },
  { level: 3, label: 'Airlines with stadium naming rights', items: ['Emirates', 'Etihad', 'Delta', 'American', 'Alaska'] },
  { level: 3, label: 'Also car models or brands', items: ['Broncos', 'Chargers', 'Jaguars', 'Mustangs'] },
  { level: 3, label: 'Named for Greek myth', items: ['Nike', 'Ajax', 'Titans', 'Trojans'] },
  { level: 3, label: '___ Johnson', items: ['Magic', 'Calvin', 'Jimmie', 'Randy', 'Keyshawn'] },
  { level: 3, label: '___ Williams', items: ['Serena', 'Venus', 'Ted', 'Ricky'] },
  { level: 3, label: '___ Jones', items: ['Chipper', 'Marion', 'Julio', 'Jerry', 'Jon'] },
  { level: 3, label: '___ Bowl', items: ['Super', 'Puppy', 'Pro', 'Rose', 'Sugar'] },
  { level: 3, label: '___ball', items: ['Pickle', 'Dodge', 'Hand', 'Volley', 'Kick', 'Soft'] },
  { level: 3, label: 'Iron ___', items: ['Bowl', 'Man', 'Mike', 'Sheik'] },
  { level: 3, label: 'Positions in more than one sport', items: ['Center', 'Guard', 'Forward', 'Fullback', 'Wing'] },
  { level: 3, label: 'Sports words that are also foods', items: ['Squash', 'Bagel', 'Slider', 'Turkey'] },
];

/** A normalized key, so "Mr. Met", "mr met" and "The Mighty Ducks" / "Mighty Ducks" compare equal. */
export const tileKey = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/^the\s+/, '').replace(/[^a-z0-9]/g, '');

/**
 * Everything a tile could be confused with: the whole tile, and its last word for multi-word names, so
 * "Babe Ruth" and "Ruth" (or "Tom Brady" and "Brady") never land on the same board in different groups.
 */
export function tileKeys(s: string): string[] {
  const words = s.trim().split(/\s+/);
  const keys = [tileKey(s)];
  if (words.length > 1) keys.push(tileKey(words[words.length - 1]));
  return keys;
}
