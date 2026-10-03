import { auth } from '@/auth';
import { isOwnerEmail } from '@/lib/cosmetics';

/** The signed-in session, only if it belongs to the owner account. Checked on every owner route. */
export async function requireOwner() {
  const s = await auth().catch(() => null);
  return s?.user?.id && isOwnerEmail(s.user.email) ? s : null;
}
