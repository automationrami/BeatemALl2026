import { setRequestLocale } from 'next-intl/server';
import { PlayerProfileView } from '@/components/PlayerProfileView';

type PageProps = {
  params: Promise<{ locale: string }>;
};

export default async function MePage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <main className="bx-page">
      <PlayerProfileView />
    </main>
  );
}
