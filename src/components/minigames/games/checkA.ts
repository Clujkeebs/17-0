/** POST a guess to the stateless per-guess feedback endpoint. */
export async function checkGuess<T>(slug: string, seed: string, guess: unknown): Promise<T> {
  const res = await fetch(`/api/mini/${slug}/check`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ seed, guess }) });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? 'Could not check that guess.');
  return body.feedback as T;
}
