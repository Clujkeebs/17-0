import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE } from '@/lib/site';
import { ContactLink, contactVerb } from '@/components/ContactLink';
import { LegalPage } from '../_components/LegalPage';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: `What ${SITE.name} collects, why, how long we keep it, and how to get it deleted. We never sell your data.`,
  alternates: { canonical: '/legal/privacy' },
};

const PROCESSORS: { name: string; purpose: string; data: string }[] = [
  { name: 'Railway', purpose: 'Application hosting, database, and cache', data: 'All account and game data we store' },
  { name: 'Resend', purpose: 'Transactional email and the newsletter', data: 'Email address, message content, delivery events' },
  { name: 'Google (OAuth)', purpose: 'Optional "Sign in with Google"', data: 'Email, name, and profile image from your Google account, only if you use it' },
  { name: 'Google AdSense', purpose: 'Displaying ads', data: 'Cookies and device identifiers set by Google; see Cookie Policy' },
  { name: 'Sentry', purpose: 'Error monitoring', data: 'Error reports with PII scrubbed before sending: no emails, IPs, or cookies' },
  { name: 'Cloudflare', purpose: 'DNS, CDN, DDoS protection, and R2 storage for player images and share cards', data: 'Request metadata including IP address, processed transiently; share card images' },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      summary={
        <ul>
          <li>We collect the minimum to run the game: your email, a display name, a username, a hashed password, and your game results.</li>
          <li>IP addresses are hashed before we store them, and only used to stop abuse and enforce rate limits.</li>
          <li>No analytics trackers. The only third-party cookies come from Google AdSense, which we disclose in full.</li>
          <li><strong>We never sell your data. Ever.</strong></li>
          <li>Delete your account from Settings. Export everything as JSON anytime.</li>
        </ul>
      }
    >
      <h2>1. Who we are</h2>
      <p>
        {SITE.name} (&quot;we,&quot; &quot;us&quot;) runs {SITE.url} from the State of California, United States. For the purposes of the EU and UK General Data Protection
        Regulation, {SITE.name} is the data controller for the personal data described here. Contact: <ContactLink kind="privacy" />, or by mail at {SITE.mailingAddress}.
      </p>

      <h2>2. What we collect</h2>
      <div className="table-wrap" tabIndex={0} role="region" aria-label="Scrollable table">
        <table>
          <thead>
            <tr><th scope="col">Data</th><th scope="col">When</th><th scope="col">Why</th></tr>
          </thead>
          <tbody>
            <tr><td>Email address</td><td>Account creation or newsletter signup</td><td>Sign-in, account recovery, email you asked for</td></tr>
            <tr><td>Display name and username</td><td>Account creation</td><td>Shown on leaderboards and share cards</td></tr>
            <tr><td>Password</td><td>Email and password signup</td><td>Stored only as a bcrypt hash (12 rounds). We never see or store the plain password.</td></tr>
            <tr><td>Game results</td><td>When you finish a game</td><td>Scores, picks, leaderboards, your history</td></tr>
            <tr><td>Hashed IP address</td><td>Signups, score submissions, sensitive requests</td><td>Rate limiting and abuse prevention only. Stored as a salted SHA-256 hash, never the raw IP.</td></tr>
            <tr><td>Google profile basics</td><td>Only if you use Sign in with Google</td><td>Email, name, and avatar to create your account</td></tr>
            <tr><td>Preferences</td><td>When you change them</td><td>Sound on or off, newsletter opt-in</td></tr>
          </tbody>
        </table>
      </div>

      <h2>3. What we do not collect</h2>
      <ul>
        <li>We do not store raw IP addresses for marketing, profiling, or anything else.</li>
        <li>We do not run third-party analytics, session replay, heatmaps, social pixels, or fingerprinting.</li>
        <li>The one exception is Google AdSense, which sets its own cookies to serve and measure ads. It is disclosed in our <Link href="/legal/cookies">Cookie Policy</Link>, with opt-out links.</li>
        <li>We do not collect precise location, contacts, payment information, or government IDs.</li>
      </ul>

      <h2>4. How we use data</h2>
      <ul>
        <li>To run the Service: sign you in, save your results, show leaderboards, and generate share cards.</li>
        <li>To send email you asked for: sign-in links, account notices, and the daily newsletter if you opted in and confirmed.</li>
        <li>To keep the Service fair and secure: detect automated score submission, enforce rate limits, and investigate abuse.</li>
        <li>To fix bugs, using error reports scrubbed of personal data.</li>
        <li>To improve the Service: read the optional feedback form at the bottom of each page (a rating, your note, the page you were on, and your account if you were signed in).</li>
        <li>To comply with the law and enforce our <Link href="/legal/terms">Terms</Link>.</li>
      </ul>
      <p>
        <strong>We never sell your data. Ever.</strong> We do not rent it, trade it, or share it for cross-context behavioral advertising. We share it only with
        the processors listed in Section 13, under contracts that limit their use to providing services to us, or when the law requires it.
      </p>

      <h2>5. Retention</h2>
      <ul>
        <li><strong>Accounts:</strong> kept until you delete them.</li>
        <li><strong>Account deletion:</strong> when you delete your account, your game results are anonymized immediately (unlinked from you and your username removed). Remaining account data is permanently deleted within 30 days.</li>
        <li><strong>Feedback:</strong> kept until it has been read and acted on. Deleting your account unlinks it from you.</li>
        <li><strong>Newsletter:</strong> when you unsubscribe, we stop sending immediately and keep a suppression record for 90 days so we do not email you by mistake, then hard delete it.</li>
        <li><strong>Sync snapshots</strong> (copies of public ratings pages used to update player data, containing no user data): 30 days.</li>
        <li><strong>Server logs:</strong> scrubbed of personal data. Rate-limit counters expire in minutes to hours.</li>
        <li><strong>Backups:</strong> deleted data may persist in encrypted backups until they rotate out, after which it is gone.</li>
      </ul>

      <h2>6. Your rights and how to use them</h2>
      <ul>
        <li><strong>Access and portability:</strong> download all your data as JSON from <Link href="/settings/export">Settings, Export</Link>.</li>
        <li><strong>Deletion:</strong> delete your account from <Link href="/settings">Settings</Link>.</li>
        <li><strong>Correction:</strong> edit your display name and username in Settings, or email us to correct anything else.</li>
        <li><strong>Opt-out:</strong> unsubscribe from the newsletter with the link in any email, and opt out of personalized ads using the links in the <Link href="/legal/cookies">Cookie Policy</Link>.</li>
      </ul>
      <p>
        For anything you cannot do yourself, {contactVerb('privacy')} <ContactLink kind="privacy" />. We respond within 30 days, or within 45 days for California requests, extendable once by 45 more with notice.
        We may need to verify your identity, usually by confirming control of your account email. You can use an authorized agent where the law allows.
      </p>

      <h2>7. GDPR (EU and UK users)</h2>
      <p><strong>Controller:</strong> {SITE.name}, {SITE.mailingAddress}.</p>
      <p><strong>Data protection contact:</strong> <ContactLink kind="privacy" subject="Data Protection" />. Put &quot;Data Protection&quot; in the subject line.</p>
      <p><strong>Legal bases:</strong></p>
      <ul>
        <li>Performance of a contract: account, game results, leaderboards, transactional email.</li>
        <li>Consent: the newsletter (double opt-in) and, where required, advertising cookies. Withdraw consent at any time.</li>
        <li>Legitimate interests: security, abuse prevention via hashed IPs, and error monitoring. We have balanced these against your rights and kept the data minimal.</li>
        <li>Legal obligation: responding to lawful requests and keeping records the law requires.</li>
      </ul>
      <p>
        You have the rights of access, rectification, erasure, restriction, portability, and objection, and the right to withdraw consent. You can
        complain to your local supervisory authority.
      </p>
      <p>
        <strong>International transfers:</strong> we are based in the United States and our processors may process data in the U.S. and elsewhere.
        Transfers of EU and UK data rely on the European Commission&apos;s Standard Contractual Clauses (and the UK Addendum), or on the EU-U.S. Data Privacy
        Framework where a processor is certified.
      </p>

      <h2>8. California (CCPA as amended by CPRA)</h2>
      <p>In the preceding 12 months we have collected these categories of personal information:</p>
      <ul>
        <li>Identifiers: email address, username, display name, hashed IP address.</li>
        <li>Internet or other electronic network activity: game results and interactions with the Service.</li>
        <li>Sensitive personal information: account login credentials (email plus password, stored hashed), used only to sign you in.</li>
      </ul>
      <p>
        Sources: you, and Google if you use Sign in with Google. Purposes: those in Section 4. Disclosed for a business purpose to: the processors in
        Section 13. <strong>We do not sell or share personal information</strong>, as those terms are defined by the CCPA, and have not done so in the
        preceding 12 months. We do not knowingly sell or share data of consumers under 16. We do not use sensitive personal information to infer
        characteristics about you.
      </p>
      <p>
        {SITE.name} is based in California, so the CCPA is our home-state law and we apply it as written. California residents have the right to:
      </p>
      <ul>
        <li><strong>Know and access</strong> the categories and specific pieces of personal information we collected, the sources, the purposes, and the categories of third parties we disclosed it to.</li>
        <li><strong>Delete</strong> personal information we collected from you, subject to the exceptions the law allows.</li>
        <li><strong>Correct</strong> inaccurate personal information.</li>
        <li><strong>Opt out of sale or sharing.</strong> We do neither. We still honor Global Privacy Control signals as an opt-out request.</li>
        <li><strong>Limit use of sensitive personal information.</strong> We already use it only to sign you in, which the law permits without an opt-out.</li>
        <li><strong>Non-discrimination.</strong> Exercising any of these rights gets you the same Service, same features, and same leaderboards.</li>
      </ul>
      <p>
        <strong>How to submit a request:</strong> {contactVerb('privacy')} <ContactLink kind="privacy" /> or write to {SITE.mailingAddress}. Most access,
        export, and deletion requests you can complete yourself in <Link href="/settings">Settings</Link>. We confirm receipt within 10 business days and
        respond within 45 days, extendable once by 45 more with notice. We verify requests by confirming control of the account email; requests for
        specific pieces of information need a higher level of verification. An authorized agent may submit a request with your signed permission, and we
        may still ask you to verify your identity directly.
      </p>
      <p>
        <strong>Retention:</strong> we keep each category only as long as described in Section 5, then delete or anonymize it.
      </p>
      <p>
        <strong>Shine the Light (Cal. Civ. Code 1798.83):</strong> we do not disclose personal information to third parties for their own direct
        marketing purposes.
      </p>

      <h2>9. Canada (CASL)</h2>
      <p>
        We send the newsletter only after express consent, confirmed through a double opt-in email. Every message identifies {SITE.name}, includes our
        mailing address, and has a working one-click unsubscribe processed immediately (and always within 10 business days, as CASL requires).
      </p>

      <h2>10. California Online Privacy Protection Act (CalOPPA) and Do Not Track</h2>
      <p>
        Browsers can send a &quot;Do Not Track&quot; signal. There is no agreed standard for how to respond, so we do not change behavior based on it. We do not track
        you across third-party sites ourselves. Google AdSense may; use the opt-out links in our <Link href="/legal/cookies">Cookie Policy</Link>. We honor
        Global Privacy Control signals as a request to opt out of sale or sharing, which we do not do anyway. We will post changes to this policy on this
        page and update the date above.
      </p>

      <h2>11. Children</h2>
      <p>
        The Service is not directed to children under 13, and we do not knowingly collect personal information from them. If you believe a child under 13
        has given us personal information, {contactVerb('privacy')} <ContactLink kind="privacy" /> and we will delete it.
      </p>

      <h2>12. Security</h2>
      <ul>
        <li>All traffic is encrypted in transit with TLS.</li>
        <li>Passwords are hashed with bcrypt at 12 rounds.</li>
        <li>Session cookies are httpOnly, Secure, and SameSite=Lax.</li>
        <li>IP addresses are salted and hashed with SHA-256 before storage.</li>
        <li>Access to production systems is restricted and logged.</li>
      </ul>
      <p>No system is perfectly secure. If we learn of a breach affecting your data, we will notify you and regulators as the law requires.</p>

      <h2>13. Processors</h2>
      <div className="table-wrap" tabIndex={0} role="region" aria-label="Scrollable table">
        <table>
          <thead>
            <tr><th scope="col">Processor</th><th scope="col">Purpose</th><th scope="col">Data involved</th></tr>
          </thead>
          <tbody>
            {PROCESSORS.map((p) => (
              <tr key={p.name}><td>{p.name}</td><td>{p.purpose}</td><td>{p.data}</td></tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>14. Changes</h2>
      <p>
        If we make a material change, we will post it here and, if you have an account, email you before it takes effect. We will not apply a material
        change to data collected before it without your consent where the law requires consent.
      </p>

      <h2>15. Contact</h2>
      <p>Privacy questions and requests: <ContactLink kind="privacy" />. General: <ContactLink kind="general" />. Mail: {SITE.mailingAddress}.</p>
    </LegalPage>
  );
}
