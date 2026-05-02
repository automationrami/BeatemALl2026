import { setRequestLocale, getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { Wordmark } from '@beat-em-all/ui';
import { listGamesForCreateTeam } from '@beat-em-all/db/queries';
import { LanguageToggle } from '@/components/LanguageToggle';
import { PersonaSwitcher } from '@/components/PersonaSwitcher';
import { CreateTeamForm } from '@/components/team/CreateTeamForm';
import { getCurrentUser } from '@/lib/current-user';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type PageProps = { params: Promise<{ locale: string }> };

export default async function CreateTeamPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const me = await getCurrentUser();
  const games = await listGamesForCreateTeam(me.playerId);
  const t = await getTranslations('teamCreate');

  // Pre-fill country from the active persona's primary team if any (rare here since
  // this page is mostly used by team-less personas), else default to KW.
  const defaultCountry = 'KW';

  return (
    <main className="min-h-screen px-6 py-8 md:px-16 md:py-12">
      <header className="flex items-center justify-between mb-10">
        <Link href={`/${locale}`}>
          <Wordmark />
        </Link>
        <div className="flex items-center gap-3">
          <LanguageToggle />
          <PersonaSwitcher />
        </div>
      </header>

      <Link
        href={`/${locale}`}
        className="inline-block bx-eyebrow mb-6 hover:text-white transition-colors"
      >
        ← {t('backToHome')}
      </Link>

      <section className="mb-8 max-w-xl">
        <p className="bx-eyebrow mb-3">{t('eyebrow')}</p>
        <h1 className="font-display font-medium text-[40px] md:text-[48px] leading-[0.95] tracking-[-0.035em] mb-4">
          {t('title')}
        </h1>
        <p className="text-[var(--t-3)] text-base leading-relaxed">
          {t('subtitle', { displayName: me.displayName })}
        </p>
      </section>

      <CreateTeamForm
        locale={locale}
        defaultCountry={defaultCountry}
        games={games}
        viewerHasTeam={me.teamMemberships.length > 0}
      />
    </main>
  );
}
