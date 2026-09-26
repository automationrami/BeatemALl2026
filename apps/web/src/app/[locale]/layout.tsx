import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { countUnreadNotifications } from '@beat-em-all/db/queries';
import { AppShell } from '@/components/shell/AppShell';
import { getViewer } from '@/lib/current-user';
import '../globals.css';

type Locale = (typeof routing.locales)[number];
const isLocale = (value: string): value is Locale =>
  (routing.locales as readonly string[]).includes(value);

export const metadata: Metadata = {
  title: "Beat'Em All — GCC Competitive Gaming",
  description: 'Form a team. Find opponents. Meet at a venue. Compete for real.',
};

// The shell shows who is signed in, so every page renders per request.
export const dynamic = 'force-dynamic';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

type LayoutProps = Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>;

export default async function LocaleLayout({ children, params }: LayoutProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const messages = await getMessages();

  const dir = locale === 'ar' ? 'rtl' : 'ltr';
  const viewer = await getViewer();
  const unread = viewer ? await countUnreadNotifications(viewer.userId).catch(() => 0) : 0;

  return (
    <html lang={locale} dir={dir} data-theme="night" className="h-full">
      <body className="min-h-full">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <AppShell
            viewer={
              viewer
                ? {
                    kind: viewer.kind,
                    displayName: viewer.displayName,
                    playerSlug: viewer.playerSlug,
                  }
                : null
            }
            isAdmin={viewer?.isAdmin ?? false}
            unread={unread}
          >
            {children}
          </AppShell>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
