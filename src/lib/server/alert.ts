export async function alertSlack(text: string) {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) { console.warn('[alert]', text); return; }
  try { await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: `[Gridiron Lab] ${text}` }) }); }
  catch (e) { console.error('[alert] slack failed', (e as Error).message); }
}
