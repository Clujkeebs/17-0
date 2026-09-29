import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { getUserById } from '@/lib/server/account';
import { DeleteAccountForm, IdentityForm, Toggle } from './SettingsForms';
import { signOutAction } from './actions';

export const metadata: Metadata = {
  title: 'Settings',
  description: 'Change your username, newsletter and sound preferences, download your data, or delete your account.',
  alternates: { canonical: '/settings' },
  robots: { index: false, follow: false },
};

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login?next=/settings');
  const user = await getUserById(session.user.id);
  if (!user) redirect('/login?next=/settings');

  return (
    <div className="container section" style={{ maxWidth: 720 }}>
      <span className="eyebrow">Account</span>
      <h1>Settings</h1>
      <p className="muted">Signed in as <span className="num">{user.email}</span>. <Link href="/profile">Back to profile</Link>.</p>

      <section aria-labelledby="identity-h" className="card" style={{ marginTop: 24 }}>
        <h2 id="identity-h">Name</h2>
        <IdentityForm username={user.username} displayName={user.name} prompt={!user.username} />
      </section>

      <section aria-labelledby="prefs-h" className="card" style={{ marginTop: 24 }}>
        <h2 id="prefs-h">Preferences</h2>
        <Toggle field="newsletterOptIn" label="Newsletter" initial={user.newsletterOptIn}
          hint={user.newsletterConfirmedAt ? 'Confirmed. Weekly at most. Every email has a one-click unsubscribe.' : 'Double opt-in: turning this on sends a confirmation link to your email.'} />
        <Toggle field="soundEnabled" label="Game sounds" initial={user.soundEnabled} hint="Reel clicks and result cues. Off by default." />
      </section>

      <section aria-labelledby="data-h" className="card" style={{ marginTop: 24 }}>
        <h2 id="data-h">Your data</h2>
        <p>Everything we store about you, as a JSON file: account fields, every game result, and your newsletter record.</p>
        <div className="row">
          <a className="btn" href="/api/user/export" download>Download my data</a>
          <Link href="/settings/export">What is in the file</Link>
        </div>
      </section>

      <section aria-labelledby="session-h" className="card" style={{ marginTop: 24 }}>
        <h2 id="session-h">Session</h2>
        <form action={signOutAction}><button className="btn" type="submit">Sign out</button></form>
      </section>

      <section aria-labelledby="delete-h" className="card card-error" style={{ marginTop: 24 }}>
        <h2 id="delete-h">Delete account</h2>
        <DeleteAccountForm />
      </section>
    </div>
  );
}
