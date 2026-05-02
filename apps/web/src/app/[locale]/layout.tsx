import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import '../globals.css';

type Locale = (typeof routing.locales)[number];
const isLocale = (value: string): value is Locale =>
  (routing.locales as readonly string[]).includes(value);

export const metadata: Metadata = {
  title: "Beat'Em All — GCC Competitive Gaming",
  description: 'Form a team. Find opponents. Meet at a venue. Compete for real.',
};

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

  return (
    <html lang={locale} dir={dir} className="h-full">
      <body className="min-h-full">
        <NextIntlClientProvider locale={locale} messages={messages}>
          {/*
            Reading-comfort cap: 1440px max width centered. Previously every page stretched
            edge-to-edge on wide monitors which made line-lengths uncomfortable. Per-page
            <main> still controls horizontal padding (px-6 / md:px-16) so narrow viewports
            don't lose breathing room.
          */}
          <div className="mx-auto max-w-[1440px]">{children}</div>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
