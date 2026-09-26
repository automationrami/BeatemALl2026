import { setRequestLocale } from 'next-intl/server';
import { HomeFeed } from '@/components/home/HomeFeed';

/**
 * Home Feed (S-E5-04). Spec: Beatemall/docs/page-specs/HOME_FEED.md.
 *
 * The page is a Server Component (sets the locale). The app shell (rail, tabs, top bar)
 * comes from the locale layout; this page renders only its <main>. The dynamic feed is
 * delegated to <HomeFeed/>, a Client Component because the active persona lives in a
 * localStorage-backed Zustand store. Phase-9 hookup replaces the persona read with a
 * real session — the section structure stays the same.
 */
type PageProps = {
  params: Promise<{ locale: string }>;
};

export default async function HomePage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main className="bx-page">
      <HomeFeed />
    </main>
  );
}
