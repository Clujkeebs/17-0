import { Fragment } from 'react';
import Link from 'next/link';
import { parseInline } from '@/lib/blog-text';

/** Keeps a record like 17-0 on one line, so a heading never wraps between the 17 and the 0. */
function keepRecords(s: string) {
  return s.split(/(\d+-\d+)/).map((part, i) => (i % 2 ? <span key={i} style={{ whiteSpace: 'nowrap' }}>{part}</span> : part));
}

/** A blog paragraph's text with [text](/path) rendered as site links. */
export function InlineText({ text }: { text: string }) {
  return <>{parseInline(text).map((part, i) => typeof part === 'string'
    ? <Fragment key={i}>{keepRecords(part)}</Fragment>
    : <Link key={i} href={part.href}>{keepRecords(part.text)}</Link>)}</>;
}
