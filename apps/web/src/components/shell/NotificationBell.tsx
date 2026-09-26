'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Bell } from 'lucide-react';

/** Top-bar bell: unread count from the server render, refreshed every minute and on navigation. */
export function NotificationBell({ initialUnread }: { initialUnread: number }) {
  const t = useTranslations('notifications');
  const locale = useLocale();
  const pathname = usePathname();
  const [unread, setUnread] = useState(initialUnread);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUnread(initialUnread);
  }, [initialUnread]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const res = await fetch('/api/notifications?count=1', { cache: 'no-store' }).catch(
        () => null,
      );
      const body = (await res?.json().catch(() => null)) as { unread?: number } | null;
      if (!cancelled && typeof body?.unread === 'number') setUnread(body.unread);
    };
    void load();
    const id = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [pathname]);

  return (
    <Link
      href={`/${locale}/notifications`}
      className="relative grid size-11 shrink-0 place-items-center rounded-md bg-surface-100 text-ink shadow-bx-card hover:text-gold-text"
      aria-label={unread > 0 ? t('bellUnread', { count: unread }) : t('bell')}
      data-testid="notification-bell"
    >
      <Bell className="bx-icon" aria-hidden />
      {unread > 0 ? (
        <span
          className="absolute -end-1 -top-1 grid min-w-5 place-items-center rounded-full bg-[image:var(--gradient-gold)] px-1 text-[11px] font-bold leading-5 text-on-gold"
          data-testid="notification-count"
        >
          {unread > 99 ? '99+' : unread}
        </span>
      ) : null}
    </Link>
  );
}
