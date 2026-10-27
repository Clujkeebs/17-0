import { NotFoundBody } from '@/components/NotFoundBody';

/** A page inside the site layout that calls notFound() (a missing player, result or post): the layout already has the header and the main. */
export default function NotFound() {
  return (
    <div className="container error-page">
      <NotFoundBody />
    </div>
  );
}
