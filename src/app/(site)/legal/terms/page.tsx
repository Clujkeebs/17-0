import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE } from '@/lib/site';
import { LegalPage } from '../_components/LegalPage';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: `The rules for using ${SITE.name}: who can play, what you can post, how disputes are handled, and what we are and are not responsible for.`,
  alternates: { canonical: '/legal/terms' },
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      summary={
        <ul>
          <li>You must be 13 or older. Keep your account secure and pick a username that is not offensive or pretending to be someone else.</li>
          <li>Play by hand. Bots, scripts, and forged score submissions get accounts removed.</li>
          <li>This is a free game for entertainment. There is no gambling, no real money, and no prizes for results.</li>
          <li>We are not affiliated with EA, the NFL, or any team. Their trademarks belong to them.</li>
          <li>The service is provided as is. Our liability is limited.</li>
          <li>Disputes go to individual arbitration, not class actions, unless you opt out within 30 days. Small claims court is always available.</li>
        </ul>
      }
    >
      <h2>1. Acceptance of these terms</h2>
      <p>
        These Terms of Service (the &quot;Terms&quot;) are an agreement between you and {SITE.name} (&quot;{SITE.name},&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;),
        operated from the State of Delaware, United States. By accessing or using the website at {SITE.url} and any related services (the &quot;Service&quot;),
        you agree to these Terms and to our <Link href="/legal/privacy">Privacy Policy</Link>. If you do not agree, do not use the Service.
      </p>

      <h2>2. Eligibility</h2>
      <p>
        You must be at least 13 years old to use the Service. If you are under the age of majority where you live, you may use the Service only with the
        involvement of a parent or legal guardian who agrees to these Terms. We do not knowingly permit anyone under 13 to create an account. If we learn
        that an account belongs to a child under 13, we will delete it.
      </p>

      <h2>3. Accounts and usernames</h2>
      <p>You can play without an account. Some features, such as the leaderboard and saved history, require one. If you create an account:</p>
      <ul>
        <li>Give us accurate information and keep your email address current.</li>
        <li>Keep your password confidential. You are responsible for activity under your account. Tell us at {SITE.contactEmail} if you believe it has been compromised.</li>
        <li>One person, one account. Accounts are not transferable.</li>
        <li>
          Usernames must not be obscene, hateful, harassing, or sexually explicit; must not impersonate a real person, player, team, league, or company; must
          not contain personal information about anyone else; and must not suggest an official affiliation with EA, the NFL, the NFLPA, or any team.
        </li>
        <li>We may reject, reset, or reclaim any username at our discretion, including names that are inactive or that we believe violate these rules.</li>
      </ul>

      <h2>4. Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Submit scores or game results through automated means, scripts, bots, modified clients, or direct calls to our APIs outside the normal use of the website.</li>
        <li>Manipulate, reverse engineer, or attempt to predict game outcomes in order to post results you did not earn through normal play.</li>
        <li>Scrape, crawl, or bulk download the Service or its data, except as permitted by our robots.txt for search engine indexing.</li>
        <li>Interfere with or disrupt the Service, probe it for vulnerabilities without permission, or bypass rate limits or security controls.</li>
        <li>Harass other users, post unlawful content, or use the Service to send spam.</li>
        <li>Use the Service for any gambling, betting, or wagering purpose, or to facilitate one.</li>
        <li>Violate any applicable law.</li>
      </ul>
      <p>
        We may remove results, reset leaderboards, and suspend or terminate accounts that we reasonably believe violate this section. Found a security
        issue? Report it to {SITE.legalEmail} and we will not pursue good-faith research that follows responsible disclosure.
      </p>

      <h2>5. User content</h2>
      <p>
        &quot;User content&quot; means anything you submit to the Service, such as your display name, username, and game results. You keep ownership of your user
        content. You grant us a worldwide, non-exclusive, royalty-free license to host, store, display, reproduce, and distribute your user content as
        needed to operate, display, and promote the Service (for example, showing your username and score on a public leaderboard or a share card). This
        license ends when you delete the content or your account, except for copies already shared publicly by you or others and backups retained as
        described in our Privacy Policy. You are responsible for your user content and promise that you have the right to submit it.
      </p>

      <h2>6. Intellectual property</h2>
      <p>
        <strong>Ours.</strong> The Service, including its software, game design, simulation engine, text, graphics, and the {SITE.name} name and logo, is
        owned by {SITE.name} and protected by intellectual property laws. We grant you a limited, personal, non-exclusive, non-transferable, revocable
        license to use the Service for your own non-commercial entertainment.
      </p>
      <p>
        <strong>Third parties.</strong> EA, EA SPORTS, and Madden NFL are trademarks of Electronic Arts Inc. NFL, team names, logos, and related marks are
        trademarks of the National Football League and its member clubs. NFLPA marks belong to the NFL Players Association. These and all other third-party
        marks belong to their respective owners and are used only to identify the subject matter they describe. {SITE.name} is not affiliated with,
        endorsed by, or sponsored by any of them. See our <Link href="/legal/disclaimer">Disclaimer</Link> for detail, and our{' '}
        <Link href="/legal/dmca">DMCA Policy</Link> if you believe something on the Service infringes your rights.
      </p>

      <h2>7. No gambling; entertainment only</h2>
      <p>
        The Service is a free game for entertainment. There is no entry fee, no real-money play, no prizes awarded based on game results, no odds, and no
        links to sportsbooks. Simulated seasons and records are fictional and do not predict real-world outcomes. Nothing on the Service is betting,
        financial, or professional advice. Any promotional giveaway we run will be governed by its own official rules, will require no purchase, and will
        be decided by a random draw that does not depend on game results.
      </p>

      <h2>8. Disclaimer of warranties</h2>
      <p>
        THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE,&quot; WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING IMPLIED WARRANTIES OF
        MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE,
        OR SECURE, OR THAT RATINGS, STATISTICS, OR OTHER DATA ARE ACCURATE, COMPLETE, OR CURRENT. Some jurisdictions do not allow the exclusion of implied
        warranties, so some of these exclusions may not apply to you.
      </p>

      <h2>9. Limitation of liability</h2>
      <p>
        TO THE FULLEST EXTENT PERMITTED BY LAW, {SITE.name.toUpperCase()} AND ITS OPERATORS WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL,
        CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES, OR ANY LOSS OF DATA, PROFITS, OR GOODWILL, ARISING OUT OF OR RELATED TO THE SERVICE. OUR TOTAL
        LIABILITY FOR ANY CLAIM ARISING OUT OF OR RELATING TO THE SERVICE OR THESE TERMS IS LIMITED TO THE GREATER OF US$50 OR THE AMOUNT YOU PAID US IN THE
        12 MONTHS BEFORE THE CLAIM (WHICH, FOR A FREE SERVICE, IS ZERO). These limits apply to the fullest extent permitted by law, including where a remedy
        fails of its essential purpose. They do not limit liability that cannot be limited under applicable law.
      </p>

      <h2>10. Indemnification</h2>
      <p>
        You agree to defend, indemnify, and hold harmless {SITE.name} and its operators from any claims, damages, losses, and expenses (including
        reasonable attorneys&apos; fees) arising out of your user content, your misuse of the Service, or your violation of these Terms or of anyone
        else&apos;s rights.
      </p>

      <h2>11. Governing law</h2>
      <p>
        These Terms are governed by the laws of the State of Delaware and applicable U.S. federal law, including the Federal Arbitration Act, without regard
        to conflict-of-laws rules. Subject to Section 12, the state and federal courts located in Delaware have exclusive jurisdiction, and you and we
        consent to venue there.
      </p>

      <h2>12. Dispute resolution: binding individual arbitration</h2>
      <p>
        <strong>Please read this section carefully. It affects your legal rights, including your right to go to court and to join a class action.</strong>
      </p>
      <h3>12.1 Informal resolution first</h3>
      <p>
        Before filing a claim, you agree to email {SITE.legalEmail} with your name, account email, a description of the dispute, and the relief you want.
        We will try to resolve it informally within 60 days. We will do the same before bringing a claim against you.
      </p>
      <h3>12.2 Agreement to arbitrate</h3>
      <p>
        Except as provided below, any dispute, claim, or controversy arising out of or relating to these Terms or the Service will be resolved by final and
        binding arbitration on an individual basis, administered by the American Arbitration Association (&quot;AAA&quot;) under its Consumer Arbitration
        Rules then in effect, available at adr.org. The arbitrator, not a court, decides questions of scope, enforceability, and arbitrability, except
        that a court decides the validity of the class action waiver below. Arbitration may be conducted by video, by phone, or on written submissions. Fee
        allocation follows the AAA Consumer Arbitration Rules. Judgment on the award may be entered in any court with jurisdiction.
      </p>
      <h3>12.3 Class action waiver</h3>
      <p>
        You and we agree that each may bring claims against the other only in an individual capacity and not as a plaintiff or class member in any
        purported class, collective, consolidated, or representative proceeding. The arbitrator may not consolidate claims of more than one person and may
        award relief only in favor of the individual party seeking it. If this waiver is found unenforceable as to a claim, that claim must be severed and
        litigated in court, and the rest of this section still applies.
      </p>
      <h3>12.4 Small claims carve-out</h3>
      <p>
        Either party may instead bring an individual claim in small claims court in the county where you live or in New Castle County, Delaware, if the
        claim qualifies and stays in that court. Either party may also seek injunctive relief in court for infringement or misuse of intellectual property.
      </p>
      <h3>12.5 30-day opt-out</h3>
      <p>
        You can opt out of this arbitration agreement by emailing {SITE.legalEmail} within 30 days after you first accept these Terms. Include your name,
        account email, and a clear statement that you opt out of arbitration. Opting out does not affect any other part of these Terms. If you opt out,
        Section 11 governs where disputes are heard.
      </p>

      <h2>13. Termination</h2>
      <p>
        You can stop using the Service at any time and delete your account from <Link href="/settings">Settings</Link>. We may suspend or terminate your
        access at any time if you violate these Terms, if required by law, or if we discontinue the Service. Sections that by their nature should survive
        termination (including 5 through 12 and 15) survive.
      </p>

      <h2>14. Changes to the Service and these Terms</h2>
      <p>
        We may change or discontinue any part of the Service. We may update these Terms. If a change is material, we will give notice on the Service or by
        email at least 14 days before it takes effect, except for changes required by law or to address security, which may take effect immediately.
        The &quot;Last updated&quot; date at the top shows the current version. Continuing to use the Service after changes take effect means you accept them.
        Changes to Section 12 will not apply to disputes we already know about.
      </p>

      <h2>15. Severability and general terms</h2>
      <p>
        If any provision of these Terms is held unenforceable, it will be enforced to the maximum extent permissible and the remaining provisions stay in
        full effect. Our failure to enforce a provision is not a waiver. These Terms, together with the policies they reference, are the entire agreement
        between you and us about the Service. You may not assign these Terms; we may assign them in connection with a merger, acquisition, or sale of
        assets. Headings are for convenience only.
      </p>

      <h2>16. Contact</h2>
      <p>
        Questions about these Terms: {SITE.legalEmail}. Everything else: {SITE.contactEmail}. By mail: {SITE.mailingAddress}.
      </p>
    </LegalPage>
  );
}
