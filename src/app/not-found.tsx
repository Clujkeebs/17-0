import { SiteHeader } from '@/components/SiteHeader';
import { NotFoundBody } from '@/components/NotFoundBody';

/** A URL that matches no route: only the root layout is around it, so this brings its own header. */
export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="container error-page">
        <NotFoundBody />
      </main>
    </>
  );
}
