import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE } from '@/lib/site';
import { LegalPage } from '../_components/LegalPage';

export const metadata: Metadata = {
  title: 'Cookie Policy',
  description: `Every cookie and browser storage key ${SITE.name} uses, what it does, and how long it lasts.`,
  alternates: { canonical: '/legal/cookies' },
};

type Row = { name: string; setBy: string; kind: string; purpose: string; duration: string };

const COOKIES: Row[] = [
  { name: 'authjs.session-token (production: __Secure-authjs.session-token)', setBy: SITE.name, kind: 'Essential', purpose: 'Keeps you signed in. Signed and encrypted, httpOnly, Secure, SameSite=Lax.', duration: '30 days' },
  { name: 'authjs.csrf-token (production: __Host-authjs.csrf-token)', setBy: SITE.name, kind: 'Essential', purpose: 'Protects sign-in and sign-out forms from cross-site request forgery.', duration: 'Session (until the browser closes)' },
  { name: 'authjs.callback-url (production: __Secure-authjs.callback-url)', setBy: SITE.name, kind: 'Essential', purpose: 'Remembers which page to return you to after signing in.', duration: 'Session (until the browser closes)' },
  { name: '__gads', setBy: 'Google AdSense', kind: 'Advertising', purpose: 'Serves ads, limits how often you see the same ad, and measures ad performance.', duration: '13 months' },
  { name: '__gpi', setBy: 'Google AdSense', kind: 'Advertising', purpose: 'Stores a publisher-scoped identifier used for ad delivery and frequency capping.', duration: '13 months' },
  { name: 'IDE', setBy: 'Google (doubleclick.net)', kind: 'Advertising', purpose: 'Used by Google to show and measure ads, including personalized ads where permitted.', duration: '13 months (EU/UK); up to 390 days elsewhere' },
];

const STORAGE: Row[] = [
  { name: 'gl-cookie-ack', setBy: SITE.name, kind: 'Functional', purpose: 'Remembers that you dismissed the cookie notice.', duration: 'Until you clear site data' },
  { name: 'gl-17-0-rules', setBy: SITE.name, kind: 'Functional', purpose: 'Remembers that you have seen the 17-0 rules so we do not show them every time.', duration: 'Until you clear site data' },
  { name: 'gl-sound', setBy: SITE.name, kind: 'Functional', purpose: 'Remembers whether game sounds are on or off.', duration: 'Until you clear site data' },
];

function Table({ rows, caption }: { rows: Row[]; caption: string }) {
  return (
    <div className="table-wrap" tabIndex={0} role="region" aria-label="Scrollable table">
      <table>
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Name</th>
            <th scope="col">Set by</th>
            <th scope="col">Type</th>
            <th scope="col">Purpose</th>
            <th scope="col">Duration</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name}>
              <td className="mono" style={{ wordBreak: 'break-word', fontSize: '.85rem' }}>{r.name}</td>
              <td>{r.setBy}</td>
              <td>{r.kind}</td>
              <td>{r.purpose}</td>
              <td>{r.duration}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function CookiesPage() {
  return (
    <LegalPage
      title="Cookie Policy"
      summary={
        <ul>
          <li>We set three cookies, all needed to sign in securely. None track you.</li>
          <li>Google AdSense sets ad cookies. You can opt out of personalized ads with the links below.</li>
          <li>We store three small preferences in your browser (not cookies): the cookie notice, the 17-0 rules, and sound.</li>
          <li>No analytics cookies, no social pixels, no session replay.</li>
        </ul>
      }
    >
      <h2>What cookies are</h2>
      <p>
        Cookies are small text files a website stores in your browser. Browser storage (localStorage) is similar, but stays on your device and is never
        sent to our servers automatically. This page lists both, because you deserve to know about each.
      </p>

      <h2>Cookies</h2>
      <Table rows={COOKIES} caption="Cookies used on this site" />
      <p className="muted" style={{ fontSize: '.88rem', marginTop: 12 }}>
        Google may set additional cookies with similar purposes (for example __eoi or NID) depending on your region and settings. Google&apos;s current list
        is at policies.google.com/technologies/cookies. Ad cookies are only set on pages where an ad slot loads.
      </p>

      <h2>Browser storage (not cookies)</h2>
      <Table rows={STORAGE} caption="Browser storage keys used on this site" />

      <h2>Opting out of ad personalization</h2>
      <ul>
        <li>Google Ads Settings: <a href="https://adssettings.google.com" rel="noopener noreferrer">adssettings.google.com</a></li>
        <li>Digital Advertising Alliance: <a href="https://www.aboutads.info/choices" rel="noopener noreferrer">www.aboutads.info/choices</a></li>
        <li>You can also block or delete cookies in your browser settings. Blocking our essential cookies will prevent you from signing in, but you can still play as a guest.</li>
      </ul>
      <p>In the EU, UK, and Switzerland, Google shows a consent message before setting advertising cookies, and personalized ads are off until you agree.</p>

      <h2>About the cookie notice</h2>
      <p>
        The notice at the bottom of the screen is intentionally small. It tells you what we use, links here, and goes away when you click &quot;Got it.&quot;
        Dismissing it stores one key (gl-cookie-ack) in your browser. It does not block the page, it does not use dark patterns, and it is not a consent
        wall. We do not need your consent for essential cookies, and consent for Google&apos;s ad cookies, where required, is collected by Google&apos;s own
        consent message.
      </p>

      <h2>Contact</h2>
      <p>
        Questions: {SITE.legalEmail}. See also our <Link href="/legal/privacy">Privacy Policy</Link>.
      </p>
    </LegalPage>
  );
}
