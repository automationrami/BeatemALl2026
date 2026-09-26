import { setRequestLocale, getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { Bell, ChevronRight } from 'lucide-react';
import { EmptyState, PageHead } from '@beat-em-all/ui';
import { listNotifications } from '@beat-em-all/db/queries';
import { getViewer } from '@/lib/current-user';
import { dateLocale } from '@/components/booking/format';
import { MarkNotificationsRead } from '@/components/shell/MarkNotificationsRead';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type PageProps = { params: Promise<{ locale: string }> };

export default async function NotificationsPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('notifications');
  const viewer = await getViewer();
  const items = viewer ? await listNotifications(viewer.userId) : [];
  const unread = items.filter((n) => !n.readAt).length;

  const when = new Intl.DateTimeFormat(dateLocale(locale), {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Kuwait',
  });

  // Message in the reader's language from `notifications.types.<type>`, English title otherwise.
  const message = (
    type: string,
    data: Record<string, string | number | null>,
    fallback: string,
  ) => {
    const key = `types.${type}`;
    if (!t.has(key)) return fallback;
    const values = Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, v === null || v === undefined ? '' : String(v)]),
    );
    try {
      return t(key, values);
    } catch {
      return fallback;
    }
  };

  return (
    <main className="bx-page">
      <PageHead
        eyebrow={[t('eyebrow')]}
        title={t('title')}
        description={unread > 0 ? t('unreadCount', { count: unread }) : t('allRead')}
      />
      {items.length === 0 ? (
        <EmptyState title={t('empty')} />
      ) : (
        <ul className="m-0 grid list-none gap-2 p-0" data-testid="notification-list">
          {items.map((n) => {
            const href = typeof n.data.href === 'string' ? `/${locale}${n.data.href}` : null;
            const body = (
              <>
                <span
                  className={[
                    'grid size-10 shrink-0 place-items-center rounded-md',
                    n.readAt ? 'bg-surface-200 text-ink-muted' : 'bg-gold-soft text-gold-text',
                  ].join(' ')}
                  aria-hidden
                >
                  <Bell className="bx-icon" />
                </span>
                <span className="grid min-w-0 gap-1">
                  <span
                    className={[
                      'text-[15px] leading-snug',
                      n.readAt ? 'text-ink-muted' : 'font-bold text-ink',
                    ].join(' ')}
                  >
                    {message(n.type, n.data, n.title)}
                  </span>
                  <span className="bx-eyebrow">{when.format(n.createdAt)}</span>
                </span>
                {href ? (
                  <ChevronRight
                    className="bx-icon bx-flip ms-auto shrink-0 text-ink-muted"
                    aria-hidden
                  />
                ) : null}
              </>
            );
            const cls = 'bx-card bx-card--flat flex items-center gap-4 px-4 py-3';
            return (
              <li
                key={n.id}
                data-testid="notification"
                data-type={n.type}
                data-unread={n.readAt ? '0' : '1'}
              >
                {href ? (
                  <Link href={href} className={`${cls} hover:bg-surface-200`}>
                    {body}
                  </Link>
                ) : (
                  <div className={cls}>{body}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {unread > 0 ? <MarkNotificationsRead /> : null}
    </main>
  );
}
