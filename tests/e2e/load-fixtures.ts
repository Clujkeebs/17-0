// Loads the e2e stand-in data (NBA, MLB, fantasy) before `next build`, so pages built ahead of time
// (the fantasy tools revalidate every 10 minutes) are built with players in them. CI runs this after db:seed.
import globalSetup from './global-setup';

globalSetup().then(() => { console.log('e2e fixtures loaded'); process.exit(0); }, (e: unknown) => { console.error(e); process.exit(1); });
