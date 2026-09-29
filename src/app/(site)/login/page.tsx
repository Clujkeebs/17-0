import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { LoginForm } from './LoginForm';
import { googleAction } from './actions';
import { safeNext } from './safe-next';

export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Sign in to track your streak, keep your scores, and get on the leaderboard.',
  alternates: { canonical: '/login' },
  robots: { index: false, follow: true },
};

const ERRORS: Record<string, string> = {
  OAuthAccountNotLinked: 'That email already has a password account. Sign in with your password instead.',
  AccessDenied: 'Sign-in was cancelled or denied.',
  Configuration: 'Sign-in is misconfigured on our end. Try again later.',
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const next = safeNext(sp.next ?? sp.callbackUrl);
  const session = await auth();
  if (session?.user?.id) redirect(next);
  const google = !!process.env.GOOGLE_CLIENT_ID;
  const error = typeof sp.error === 'string' ? (ERRORS[sp.error] ?? 'Sign-in failed. Try again.') : null;

  return (
    <div className="container section" style={{ maxWidth: 480 }}>
      <span className="eyebrow">Account</span>
      <h1>Sign in</h1>
      <p className="muted">Keep your scores, track your daily streak, and get a name on the leaderboard.</p>
      {sp.registered && <p role="status" className="card card-green" style={{ marginBottom: 16 }}>Account ready. Sign in with the email and password you just set.</p>}
      {error && <p role="alert" className="card card-error" style={{ marginBottom: 16 }}>{error}</p>}
      <div className="card">
        <LoginForm next={next} />
        {google && (
          <>
            <p className="muted" style={{ textAlign: 'center', margin: '16px 0' }}>or</p>
            <form action={googleAction}>
              <input type="hidden" name="next" value={next} />
              <button className="btn" type="submit" style={{ width: '100%' }}>Continue with Google</button>
            </form>
          </>
        )}
      </div>
      <p style={{ marginTop: 16 }}>New here? <Link href={`/register${next !== '/profile' ? `?next=${encodeURIComponent(next)}` : ''}`}>Create an account</Link>.</p>
    </div>
  );
}
