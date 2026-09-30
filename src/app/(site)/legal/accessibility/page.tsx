import type { Metadata } from 'next';
import { SITE } from '@/lib/site';
import { ContactLink, contactVerb } from '@/components/ContactLink';
import { LegalPage } from '../_components/LegalPage';

export const metadata: Metadata = {
  title: 'Accessibility Statement',
  description: `${SITE.name} targets WCAG 2.2 AA. What we did, what is still imperfect, and how to report a barrier.`,
  alternates: { canonical: '/legal/accessibility' },
};

export default function AccessibilityPage() {
  return (
    <LegalPage
      title="Accessibility Statement"
      eyebrow="Accessibility"
      summary={
        <ul>
          <li>Our target is WCAG 2.2 Level AA across the whole site, including the games.</li>
          <li>Everything works with a keyboard, focus is always visible, and motion respects your settings.</li>
          <li>Ads and some team logos are outside our full control. We say so below.</li>
          <li>Found a barrier? Tell us through <ContactLink kind="accessibility" />. We reply within 5 business days.</li>
        </ul>
      }
    >
      <h2>Our target</h2>
      <p>
        We aim to conform to the Web Content Accessibility Guidelines (WCAG) 2.2 at Level AA. We test with automated checks (axe) on every build, and by
        hand with a keyboard and screen readers (VoiceOver and NVDA).
      </p>

      <h2>What we did</h2>
      <ul>
        <li><strong>Keyboard:</strong> every control, including spinning, picking, and sharing, works with a keyboard alone. No keyboard traps.</li>
        <li><strong>Focus rings:</strong> a 3px orange outline on every focused element. We never remove it.</li>
        <li><strong>Contrast:</strong> body text is bone on navy at 17.7:1; secondary text is at least 9.3:1; the orange accent is 6.0:1 on navy.</li>
        <li><strong>Reduced motion:</strong> if your system asks for reduced motion, animations and transitions are effectively turned off.</li>
        <li><strong>Labels:</strong> every form field has a visible label; errors are announced and tied to their field.</li>
        <li><strong>Skip link:</strong> the first tab stop jumps straight to the main content.</li>
        <li><strong>No color-only information:</strong> wins, losses, and rating tiers always carry text or a symbol, not just a color.</li>
        <li><strong>Targets:</strong> buttons are at least 44 pixels tall.</li>
        <li><strong>Structure:</strong> one h1 per page, ordered headings, landmarks, and table headers with scope.</li>
      </ul>

      <h2>Known limitations</h2>
      <ul>
        <li>
          <strong>Spin reel animation:</strong> the reel is decorative. The team it lands on is announced through a live region, so screen reader users get
          the result without the animation, and reduced motion skips it.
        </li>
        <li><strong>Ads:</strong> ads are served by Google AdSense. We label ad slots and reserve their space, but we cannot guarantee the ad content itself is accessible.</li>
        <li><strong>Team logos:</strong> some team logos have low contrast against our navy background. Team names always appear as text next to them.</li>
      </ul>

      <h2>Report a barrier</h2>
      <p>
        Reach us through <ContactLink kind="accessibility" /> with the page, what you were trying to do, and the device, browser, and assistive technology you use if you are willing
        to share it. We will reply within 5 business days with either a fix or a plan and a date. If something blocks you from playing, we treat it as a
        bug with top priority.
      </p>
      <p>You can also write to us at {SITE.mailingAddress}.</p>
    </LegalPage>
  );
}
