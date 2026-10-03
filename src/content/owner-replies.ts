/**
 * Replies to the owner's notes from /owner, keyed by the first 8 characters of the note id. The agent that
 * reads the notes (hourly, from the web logs) adds a line here with each deploy that answers one.
 */
export type ReplyStatus = 'done' | 'working' | 'needs-you';
export const OWNER_REPLIES: Record<string, { status: ReplyStatus; reply: string }> = {};
