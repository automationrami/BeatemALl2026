import { setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import { Wordmark } from '@beat-em-all/ui';
import { PersonaSwitcher } from '@/components/PersonaSwitcher';
import { LanguageToggle } from '@/components/LanguageToggle';
import { HomeFeed } from '@/components/home/HomeFeed';

/**
 * Home Feed (S-E5-04). Spec: Beatemall/docs/page-specs/HOME_FEED.md.
 *
 * The page shell is a Server Component (sets locale + renders chrome). The dynamic feed
 * is delegated to <HomeFeed/> which is a Client Component because the active persona
 * lives in a localStorage-backed Zustand store. Phase-9 hookup will replace the persona
 * read with a Supabase session — the section structure stays the same.
 */
type PageProps = {
  params: Promise<{ locale: string }>;
};

export default async function HomePage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main className="min-h-screen px-6 py-8 md:px-12 md:py-10">
      <header className="flex items-center justify-between mb-8">
        <Link href={`/${locale}`}>
          <Wordmark />
        </Link>
        <div className="flex items-center gap-3">
          <LanguageToggle />
          <PersonaSwitcher />
        </div>
      </header>

      <HomeFeed />

      <footer className="mt-16 pt-8 border-t border-[var(--line)] flex items-center justify-between text-xs text-[var(--t-4)] font-mono">
        <span className="tracking-widest uppercase">beat&apos;em all</span>
        <span>v0.0.1 · localhost</span>
      </footer>
    </main>
  );
}
