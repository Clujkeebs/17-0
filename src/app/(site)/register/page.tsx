import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { RegisterForm } from './RegisterForm';
import { googleAction } from '../login/actions';
import { safeNext } from '../login/safe-next';

export const metadata: Metadata = {
  title: 'Create an account',
  description: 'Create a free account to save scores, build a daily streak, and appear on the leaderboard.',
  alternates: { canonical: '/register' },
  robots: { index: false, follow: true },
};

export default async function RegisterPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  const session = await auth();
  if (session?.user?.id) redirect(next);
  const google = !!process.env.GOOGLE_CLIENT_ID;

  return (
    <div className="container section" style={{ maxWidth: 480 }}>
      <span className="eyebrow">Account</span>
      <h1>Create an account</h1>
      <p className="muted">Free. Your scores, your streak, your name on the board. No account needed to play.</p>
      <div className="card">
        <RegisterForm next={next} />
        {google && (
          <>
            <p className="muted" style={{ textAlign: 'center', margin: '16px 0' }}>or</p>
            <form action={googleAction}>
              <input type="hidden" name="next" value="/settings" />
              <button className="btn" type="submit" style={{ width: '100%' }}>Continue with Google</button>
            </form>
          </>
        )}
      </div>
      <p style={{ marginTop: 16 }}>Already have one? <Link href="/login">Sign in</Link>.</p>
      <p className="fine">By creating an account you agree to the <Link href="/terms">terms</Link> and <Link href="/privacy">privacy policy</Link>.</p>
    </div>
  );
}
