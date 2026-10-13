import { redirect } from 'next/navigation';

/** Unbeaten Bowl is taken down. The old link goes to the games list. */
export default function Page() {
  redirect('/games');
}
