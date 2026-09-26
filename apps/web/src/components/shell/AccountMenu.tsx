'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { LogIn, LogOut } from 'lucide-react';
import { Avatar, Button, buttonClass } from '@beat-em-all/ui';
import { PersonaSwitcher } from '@/components/PersonaSwitcher';

export type ShellViewer = {
  kind: 'account' | 'demo';
  displayName: string;
  playerSlug: string | null;
};

/**
 * Signed in: your name and Sign out. Signed out: Sign in, plus the demo-account switcher so
 * the pilot can still be explored as the seeded personas.
 */
export function AccountMenu({ viewer }: { viewer: ShellViewer | null }) {
  const t = useTranslations('account');
  const locale = useLocale();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  if (viewer?.kind === 'account') {
    const signOut = async () => {
      setBusy(true);
      await fetch('/api/auth/signout', { method: 'POST' }).catch(() => null);
      router.push(`/${locale}`);
      router.refresh();
      setBusy(false);
    };
    return (
      <div className="flex items-center gap-2" data-testid="account-menu">
        <Link
          href={`/${locale}/me`}
          className="flex h-11 min-w-0 items-center gap-2 rounded-md bg-surface-100 ps-1.5 pe-3 shadow-bx-card hover:text-gold-text"
        >
          <Avatar name={viewer.displayName} size={32} />
          <span
            className="hidden max-w-[14ch] truncate text-sm font-bold text-ink sm:inline"
            data-testid="account-name"
          >
            {viewer.displayName}
          </span>
        </Link>
        <Button
          variant="ghost"
          size="sm"
          onClick={signOut}
          disabled={busy}
          aria-label={t('signOut')}
          data-testid="sign-out"
        >
          <LogOut className="bx-icon bx-flip" aria-hidden />
          <span className="hidden sm:inline">{t('signOut')}</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        href={`/${locale}/sign-in`}
        className={buttonClass('gold', 'sm')}
        data-testid="sign-in-link"
      >
        <LogIn className="bx-icon bx-flip" aria-hidden />
        <span className="hidden sm:inline">{t('signIn')}</span>
      </Link>
      <PersonaSwitcher />
    </div>
  );
}
