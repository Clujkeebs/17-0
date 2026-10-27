import { NotFoundBody } from '@/components/NotFoundBody';

/** A game page that calls notFound(): the game layout already has the header and the main. */
export default function NotFound() {
  return (
    <div className="container error-page">
      <NotFoundBody />
    </div>
  );
}
