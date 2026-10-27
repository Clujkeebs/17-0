// Guides to the daily puzzles. Rules come from src/lib/minigames/puzzles; the letter counts are from the real Sportle word list.
import type { BlogPost } from './types';

export const PUZZLE_POSTS: BlogPost[] = [
  {
    slug: 'sports-connections-tips-and-scoring',
    title: 'Sports Connections: how it is scored and how to solve it faster',
    date: '2026-10-27',
    category: 'Puzzles',
    excerpt: 'Sixteen tiles, four hidden groups, four mistakes. How the boards are built so each has one answer, how ranked play scores you, and habits that save mistakes.',
    sections: [
      {
        h2: 'The rules in one paragraph',
        paragraphs: [
          `[Sports Connections](/games/sports-connections) shows sixteen tiles. They split into four groups of four that share something: a team, a college, a position, a nickname, a year, a broadcaster, a word that can follow a given word. You select four tiles and submit. A correct group is revealed in its color and locked. A wrong guess costs a mistake, and four mistakes end the game. If your guess has three of four tiles from one group, the game tells you that you were one away.`,
          `The groups run from yellow, the most straightforward, through green and blue to purple, the trickiest, which is often wordplay. Ranked play scores you on groups found first, then fewest mistakes, then fastest time, so a clean solve beats a quick sloppy one.`,
        ],
      },
      {
        h2: 'How a game is scored',
        paragraphs: [
          `The score is built so the order of what matters is clear. Each group you find is worth 100,000. If you finish all four, each mistake you did not make is worth another 10,000, and your time comes after that. So a clean solve beats a sloppy one, and a sloppy solve beats a fast failure. Do not rush the first group.`,
        ],
      },
      {
        h2: 'Why every board has one answer',
        paragraphs: [
          `The boards are built from a hand-written bank of 136 categories across every sport, plus television, movies, broadcasters, colleges, champions, soccer, nicknames and fill-in-the-blank wordplay. Facts are limited to closed seasons and permanent records, so an answer cannot change next month. Each board uses exactly one category per color.`,
          `The part that matters when you solve is the rule that keeps boards fair. A tile is only used if neither it nor its last word appears in another chosen category. That means no tile belongs to two groups on the same board, however much it looks like it could. When a tile seems to fit two groups, one of those groups is a red herring made out of other tiles, and the right move is to find the group where the fit is complete.`,
        ],
      },
      {
        h2: 'Solve from the group with the fewest options',
        paragraphs: [
          `Start by looking for a category where you can name four tiles with certainty. It is often yellow, but not always. If you can name five tiles that seem to fit, you have found the overlap, and the extra tile belongs somewhere else. Do not submit yet. Look at the fifth tile and ask which other group it could join. If it clearly fits one, the original four are settled.`,
          `When two groups seem to claim the same tile, solve the other group first. Taking away the group you are sure of removes the competing tile from the pool and often makes the second group obvious.`,
        ],
      },
      {
        h2: 'Reading the tricky groups',
        paragraphs: [
          `Purple groups are rarely about the tiles directly. They are about a property of the words: they all become something when you add a word before or after them, they hide another word, they are nicknames, or they are things from one specific place. If four tiles look unrelated, try the property approach: read each tile for hidden words, ask what could precede or follow all of them, and think about where else you have seen them.`,
          `Fill-in-the-blank categories are the easiest to confirm. If four tiles each complete the same phrase, there is no other reading. Say the phrase out loud with each tile in turn.`,
        ],
      },
      {
        h2: 'The kinds of groups you will see',
        paragraphs: [
          `Knowing the families makes the hunt faster. Each family has its own way in.`,
        ],
        list: [
          `Teams that share something: a city, a state, a mascot type, a stadium, a color. Say each tile's home out loud.`,
          `People who share something: a college, a retired number, a record, a role such as broadcaster or announcer. Ask what each name has in common beyond the sport.`,
          `Champions and award winners for a closed set of years. These are usually yellow or green, because a fan either knows them or does not.`,
          `Nicknames. Four tiles that are all someone's nickname are often the purple group.`,
          `Fill in the blank. Four tiles that each complete the same phrase, such as a word before or after the blank. Test one phrase against all sixteen tiles.`,
          `Hidden words. A word tucked inside each tile, such as an animal or a color. Read the tiles slowly.`,
        ],
      },
      {
        h2: 'Spending mistakes wisely',
        paragraphs: [
          `Four mistakes sounds like plenty. It is not, when each wrong submission also teaches you very little. The one-away message is the exception: it tells you three of the four are right, which is real information. Use it. Swap one tile at a time, starting with the one you are least sure of.`,
          `If you have used two mistakes and still have no group, stop guessing and shuffle. The shuffle button re-lays the grid without costing anything, and tile position leads people into false patterns. A fresh arrangement often shows a group that was hidden by layout. At the end you can copy the result as a grid of colored squares, which is the way to share a game without spoiling the answers.`,
        ],
      },
    ],
  },

  {
    slug: 'sportle-strategy-and-the-word-list',
    title: 'Sportle strategy, with letter counts from the real word list',
    date: '2026-10-27',
    category: 'Puzzles',
    excerpt: 'Six tries at a five-letter sports word. How the answers are chosen, which letters turn up most in the team-name and sports-term list, and how to use the hint.',
    sections: [
      {
        h2: 'What the answer can be',
        paragraphs: [
          `[Sportle](/games/sports-wordle) gives you six tries to find a five-letter word. About half the days the answer is the last name of a current NFL, NBA or MLB star, and about half the days it is a team name or a sports term. A hint is shown from the start that tells you which kind: the league for a star, or Team name, or Sports term.`,
          `Marking is the usual kind. Green means the right letter in the right spot. Gold means the letter is in the word but elsewhere. Repeated letters are handled the standard way: exact matches are marked first, and a letter shows as present only up to the number of times it remains unmatched in the answer. Ranked play scores you on fewest guesses, then fastest time.`,
        ],
      },
      {
        h2: 'Letter counts from the real list',
        paragraphs: [
          `The team names and sports terms come from a hand-picked list of 54 five-letter words, so we can count them exactly. The most common letters across all 54 are in the table. The words on star days are surnames, which follow a different pattern, so these counts apply to Team name and Sports term days.`,
        ],
        table: {
          caption: 'Most common letters in the 54-word team name and sports term list',
          head: ['Letter', 'Times it appears', 'Words containing it'],
          rows: [
            ['S', '30', '27'],
            ['E', '28', '23'],
            ['A', '23', '22'],
            ['L', '21', '18'],
            ['T', '19', '18'],
            ['C', '17', '15'],
            ['R', '14', '14'],
            ['O', '10', '10'],
          ],
        },
        closing: [
          `Half of the words contain an S and almost as many contain an E or an A. Together, S, E and A appear in nearly every word. A first guess built from those letters, with a T or an L, tells you most of what you need.`,
        ],
      },
      {
        h2: 'Where the letters sit',
        paragraphs: [
          `Position matters even more. In the list, the fifth letter is S in 17 words and E in 12. The first letter is S in 12 words and B in 8. The second letter is A in 8 words and O in 7. If your first guess puts an S in the last spot and nothing else is green, you have learned something worth a lot.`,
          `On Team name days the pattern is stronger. Thirteen of the fourteen team names in the list end in S, because most team names are plural nouns. A hint of Team name means you can nearly assume the last letter and spend your first guess finding the other four.`,
        ],
      },
      {
        h2: 'A worked game, run through the real marker',
        paragraphs: [
          `Suppose the hint says Sports term and the answer is DRAFT. A first guess of SLATE gets back the marks in the table, produced by the same function the game uses. S, L and E are gone. A is green in the third spot. T is in the word but not fourth.`,
        ],
        table: {
          caption: 'A three-guess Sportle game on a Sports term day',
          head: ['Guess', 'Marks', 'What it tells you'],
          rows: [
            ['SLATE', 'no, no, green, gold, no', 'S, L and E are out. A is third. T is in the word but not fourth.'],
            ['TRACK', 'gold, green, green, no, no', 'T is in the word but not first. R is second. C and K are out.'],
            ['DRAFT', 'green all five', 'Solved in three.'],
          ],
        },
        closing: [
          `Check that against the word list. After SLATE alone, only two of the 54 words in the list fit those marks: DRAFT and TRACK. After TRACK as well, only DRAFT does. A good first guess does most of the work, and a good second guess is one that separates the words still in play.`,
        ],
      },
      {
        h2: 'Star-name days',
        paragraphs: [
          `When the hint names a league, think about surnames with exactly five letters from that league's current stars. Surnames are less predictable than team names, so the first two guesses should test common letters, and the third should be a real candidate. Suffixes like Jr. are dropped, and apostrophes and spaces are ignored.`,
          `Do not guess a name just because it is famous. The answer is always a player the game knows, but it is picked from a pool of recognizable current players, so lesser-known stars are as likely as the headline names.`,
        ],
      },
      {
        h2: 'Mistakes to avoid',
        paragraphs: [
          `Four habits cost guesses.`,
        ],
        list: [
          `Reusing a letter the game has ruled out. It feels like progress and tells you nothing.`,
          `Ignoring a green. A letter in the right place is the strongest clue you will get, so build the next guess around it.`,
          `Forgetting the hint. It tells you whether to expect a surname, a plural team name or a game term, and each has a different shape.`,
          `Chasing the one word you like. If three candidates remain, a guess that separates them beats a guess that merely could be right.`,
        ],
      },
      {
        h2: 'A plan for six tries',
        paragraphs: [
          `First guess: a word with common letters and no repeats. Second guess: another with different common letters, built to cover what the first missed. By now you will usually have two or three letters fixed. Third and fourth guesses are for placing them and eliminating alternatives. Fifth and sixth are for the answer.`,
          `If you are on try four with three letters green and four candidates, do not guess one at random. Pick a word that splits the candidates by the letters where they differ, even if it cannot be the answer. A guess that cannot win but guarantees you will win next turn is better than one that wins a quarter of the time and leaves you stuck otherwise.`,
        ],
      },
    ],
  },

  {
    slug: 'sports-strands-and-crossword-how-they-work',
    title: 'Sports Strands and the daily crossword: how they work',
    date: '2026-10-27',
    category: 'Puzzles',
    excerpt: 'Trace the hidden theme words on a 6 by 8 board, or fill eight crossing words from clues. The rules, how each is ranked, and tips for both.',
    sections: [
      {
        h2: 'Sports Strands',
        paragraphs: [
          `[Sports Strands](/games/sports-strands) is a board of letters, six across and eight down, that hides a sports theme. Every letter on the board belongs to one hidden word. You trace a word by dragging across touching letters, sideways, up, down or diagonally, or by tapping letters one at a time and tapping the last one again to submit. Words are four letters or more, and a letter is used once.`,
          `The theme is printed above the board and tells you what the words have in common. One of the words is the spangram: it names the theme and stretches from one edge of the board to the opposite edge. When every letter has been used in a theme word, the board is clear.`,
        ],
      },
      {
        h2: 'Scoring and hints in Strands',
        paragraphs: [
          `Ranked play scores you on words found, then fewest hints, then fastest time. A hint lights up the letters of one word, but you still have to trace it. A wrong trace is not counted against you apart from the time it takes. The score counts the words you find and the hints you use, so the hints are the real cost.`,
          `Because every letter is used, you can use the board's shape as a clue. If a corner letter is not part of any word you have found, it is part of a word that touches the edge. A group of letters that cannot form anything on its own must be part of a longer word that passes through.`,
        ],
      },
      {
        h2: 'Strands tips',
        paragraphs: [
          `Find the spangram early if you can. It spans the board edge to edge, so it uses a long run of letters, and once it is found it removes a whole stripe from the puzzle and simplifies everything around it. Look for the theme words you can predict from the category before tracing anything, and use the odd letters, like Q or Z, as anchors.`,
          `Work from edges and corners, which have fewer neighbors and fewer options. Look for common endings such as ING, ER and ED, which give you the tail of a word. And remember that the words are all about the theme: a word you find that has nothing to do with the theme is probably a coincidence, not a word in the puzzle.`,
        ],
      },
      {
        h2: 'The Sports Crossword',
        paragraphs: [
          `The [daily crossword](/games/sports-crossword) is a criss-cross puzzle of eight sports words: teams, legends, rules and slang. The words are placed one at a time, each crossing a word already on the board, and none touches another side by side. Same seed, same puzzle, so everyone gets the same board on a given day. It is not a symmetric newspaper grid, and the clues are written for this puzzle.`,
          `Tap a square to type. Tap it again to switch between across and down. Tap a clue to jump to its word. The Check button tells you how many letters are wrong, but not which ones. Each check that finds a mistake adds 10 seconds to your time, and you can check up to 30 times. Ranked play scores you on solving it, then fastest time.`,
        ],
      },
      {
        h2: 'Crossword tips',
        paragraphs: [
          `Start with the clue you know. Every word crosses at least one other, so each letter you place becomes a free letter in a second word. Fill the words that cross the most others first, since they give the most letters back. If a clue is a name or a team, count the squares: a ten-letter team name is not a ten-letter word.`,
          `Use Check sparingly, because the penalty is a flat ten seconds whenever you are wrong. A check that finds no mistakes costs nothing, so it is the right tool when you are confident and want confirmation. Used when you have no idea, it only costs time.`,
        ],
      },
      {
        h2: 'Common mistakes in both',
        paragraphs: [
          `The same few habits cost time in both puzzles.`,
        ],
        list: [
          `Strands: tracing a long word first because it looks right, before checking that the letters it uses are not needed by a word in the corner. Short words in awkward spots are usually the safest to find first.`,
          `Strands: using a hint early. A hint costs rank, and the first words are usually the easiest to find by theme.`,
          `Crossword: filling an answer you are unsure of. A wrong letter becomes a wrong crossing letter in another word, and now two clues look unsolvable.`,
          `Crossword: pressing Check as a guess. A check that finds a mistake adds ten seconds, so it is for confirming what you believe, not for fishing.`,
        ],
        closing: [
          `Both puzzles are the same size every day and take a few minutes. The best way to improve is to play them daily and to notice, afterward, which answer you saw last.`,
        ],
      },
    ],
  },
];
