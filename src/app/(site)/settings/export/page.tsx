import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';

export const metadata: Metadata = {
  title: 'Download your data',
  description: 'Export everything Gridiron Lab stores about your account as a JSON file.',
  alternates: { canonical: '/settings/export' },
  robots: { index: false, follow: false },
};

export default async function ExportPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login?next=/settings/export');
  return (
    <div className="container section prose">
      <span className="eyebrow">Your data</span>
      <h1>Download your data</h1>
      <p>One JSON file, generated on request. It contains:</p>
      <ul>
        <li><strong>Account:</strong> email, username, display name, sign-up date, sign-in methods, and your newsletter and sound preferences. Your password hash is never included.</li>
        <li><strong>Game results:</strong> every run tied to your account, with scores, picks, and dates.</li>
        <li><strong>Newsletter record:</strong> if this email is on the list, when it subscribed, confirmed, or unsubscribed, and the signup source.</li>
      </ul>
      <p>We do not keep anything else tied to you. Analytics are aggregate counters with no identifiers, and IP addresses are stored only as salted hashes for rate limiting.</p>
      <p className="row"><a className="btn btn-primary" href="/api/user/export" download>Download JSON</a> <Link href="/settings">Back to settings</Link></p>
    </div>
  );
}
