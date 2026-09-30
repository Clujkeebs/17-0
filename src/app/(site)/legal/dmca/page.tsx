import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE } from '@/lib/site';
import { ContactLink, contactVerb } from '@/components/ContactLink';
import { LegalPage } from '../_components/LegalPage';

export const metadata: Metadata = {
  title: 'DMCA and Copyright Policy',
  description: `How to send ${SITE.name} a copyright notice or counter-notice, our designated agent, and our 48-hour image takedown commitment.`,
  alternates: { canonical: '/legal/dmca' },
};

export default function DmcaPage() {
  return (
    <LegalPage
      title="DMCA and Copyright Policy"
      summary={
        <ul>
          <li>If you own something on this site and want it down, {contactVerb('dmca')} <ContactLink kind="dmca" />.</li>
          <li>Player images come down within 48 hours of any request. No formal notice needed.</li>
          <li>For everything else, a DMCA notice needs the six items listed below.</li>
          <li>If we removed your content by mistake, you can send a counter-notice.</li>
          <li>Accounts that repeatedly infringe are terminated.</li>
        </ul>
      }
    >
      <h2>Designated agent</h2>
      <address className="card" style={{ fontStyle: 'normal', margin: '0 0 1em' }}>
        <strong>{SITE.name}, Attn: DMCA Agent</strong>
        <br />
        {SITE.mailingAddress.replace(/^Unbeaten, /, '')}
        <br />
        Online: <ContactLink kind="dmca" />
      </address>

      <h2>48-hour image takedown</h2>
      <p>
        Player images are shown for identification only. If you are the rights holder (or the person pictured) and want an image removed, {contactVerb('dmca')}{' '}
        <ContactLink kind="dmca" /> with the page URL. We remove it within 48 hours. You do not need to send a formal DMCA notice for this.
      </p>

      <h2>Filing a DMCA notice</h2>
      <p>
        Under 17 U.S.C. 512(c)(3), a notice of claimed infringement must be in writing, sent to our designated agent, and include substantially the
        following:
      </p>
      <ol>
        <li>A physical or electronic signature of a person authorized to act on behalf of the owner of the exclusive right allegedly infringed.</li>
        <li>Identification of the copyrighted work claimed to have been infringed (or, for multiple works, a representative list).</li>
        <li>Identification of the material claimed to be infringing and information reasonably sufficient for us to locate it, such as the URL.</li>
        <li>Information reasonably sufficient for us to contact you, such as your address, telephone number, and email.</li>
        <li>A statement that you have a good faith belief that use of the material in the manner complained of is not authorized by the copyright owner, its agent, or the law.</li>
        <li>A statement that the information in the notice is accurate, and, under penalty of perjury, that you are authorized to act on behalf of the owner of the exclusive right allegedly infringed.</li>
      </ol>
      <p>
        Knowingly misrepresenting that material is infringing can make you liable for damages under 17 U.S.C. 512(f). Please consider fair use before
        sending a notice.
      </p>

      <h2>Counter-notice</h2>
      <p>
        If material you posted was removed and you believe it was a mistake or misidentification, you can send a counter-notice to our designated agent
        under 17 U.S.C. 512(g)(3). It must include:
      </p>
      <ol>
        <li>Your physical or electronic signature.</li>
        <li>Identification of the material removed and the location where it appeared before removal.</li>
        <li>A statement under penalty of perjury that you have a good faith belief the material was removed as a result of mistake or misidentification.</li>
        <li>
          Your name, address, and telephone number, and a statement that you consent to the jurisdiction of the federal district court for the judicial
          district in which your address is located (or, if outside the United States, any judicial district in which {SITE.name} may be found), and that
          you will accept service of process from the person who provided the original notice or their agent.
        </li>
      </ol>
      <p>
        We will forward the counter-notice to the original complainant. If they do not notify us within 10 business days that they have filed a court
        action, we may restore the material within 10 to 14 business days after receiving the counter-notice.
      </p>

      <h2>Repeat infringer policy</h2>
      <p>
        We terminate, in appropriate circumstances, the accounts of users who are repeat infringers. An account that receives three valid notices that are
        not successfully countered will be terminated, and we may terminate sooner for flagrant cases.
      </p>

      <h2>Trademark and other concerns</h2>
      <p>
        For trademark or other rights concerns that are not copyright, {contactVerb('legal')} <ContactLink kind="legal" />. See also our <Link href="/legal/disclaimer">Disclaimer</Link>.
      </p>
    </LegalPage>
  );
}
