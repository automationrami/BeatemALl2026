import { setRequestLocale, getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { CalendarCheck, ChevronRight } from 'lucide-react';
import { EmptyState, PageHead, SectionTitle, StatStrip, Tag, buttonClass } from '@beat-em-all/ui';
import {
  listVoucherScopeOptions,
  loadVoucherWallet,
  type VoucherRedemptionItem,
} from '@beat-em-all/db/queries';
import { getCurrentUser } from '@/lib/current-user';
import { dateLocale, formatAmount } from '@/components/booking/format';
import { IssueVoucherForm } from '@/components/voucher/IssueVoucherForm';
import { VoucherCard } from '@/components/voucher/VoucherCard';
import { voucherState } from '@/components/voucher/state';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type PageProps = { params: Promise<{ locale: string }> };

export default async function VouchersPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const me = await getCurrentUser();
  const t = await getTranslations('vouchers');
  const tb = await getTranslations('booking');

  const data = await loadVoucherWallet({ userId: me.userId, playerId: me.playerId });
  const canIssue = data.issuing.organizations.length > 0;
  const scope = canIssue ? await listVoucherScopeOptions() : { teams: [], venues: [] };

  const active = data.wallet.filter((v) => voucherState(v) === 'active');
  const balance = active
    .filter((v) => v.kind === 'stored_value')
    .reduce((sum, v) => sum + (v.balanceKwd ?? 0), 0);
  const money = (n: number) => t('money', { amount: formatAmount(n) });

  const date = new Intl.DateTimeFormat(dateLocale(locale), {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Kuwait',
  });

  const redemptionList = (items: VoucherRedemptionItem[], testId: string) => (
    <ul className="m-0 grid list-none gap-2 p-0" data-testid={testId}>
      {items.map((r) => {
        const href = r.bookingId
          ? `/${locale}/bookings/${r.bookingId}`
          : r.registrationId
            ? `/${locale}/registrations/${r.registrationId}`
            : null;
        const row = (
          <>
            <div className="grid min-w-0 gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <Tag tone={r.purpose === 'booking' ? 'ink' : 'soft'}>
                  {r.purpose === 'booking' ? t('purposeBooking') : t('purposeEntry')}
                </Tag>
                <span className="font-mono text-[13px] font-bold text-ink" dir="ltr">
                  {r.code}
                </span>
              </div>
              <p className="m-0 truncate text-[13px] text-ink-muted">
                {date.format(r.createdAt)} ·{' '}
                {t('redemptionBy', { team: r.teamName, name: r.redeemedBy })}
              </p>
            </div>
            <span className="bx-num text-[20px] text-ink">{money(r.amountKwd)}</span>
            {href ? (
              <ChevronRight className="bx-icon bx-flip text-ink-muted" aria-hidden />
            ) : (
              <span />
            )}
          </>
        );
        const cls =
          'bx-card bx-card--flat grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-4 px-4 py-3';
        return (
          <li key={r.id}>
            {href ? (
              <Link href={href} className={`${cls} hover:bg-surface-200`}>
                {row}
              </Link>
            ) : (
              <div className={cls}>{row}</div>
            )}
          </li>
        );
      })}
    </ul>
  );

  return (
    <main className="bx-page">
      <PageHead
        eyebrow={[t('eyebrow')]}
        title={t('title')}
        description={t('description')}
        aside={
          <Link href={`/${locale}/bookings`} className={buttonClass('ink', 'sm')}>
            <CalendarCheck className="bx-icon" aria-hidden />
            {tb('inboxTitle')}
          </Link>
        }
      >
        <StatStrip
          items={[
            { label: t('statActive'), value: active.length, tone: 'gold' },
            {
              label: t('statUnlimited'),
              value: active.filter((v) => v.kind === 'unlimited').length,
            },
            { label: t('statBalance'), value: money(balance) },
            { label: t('statUses'), value: data.redemptions.length },
          ]}
        />
      </PageHead>

      <section className="grid gap-4" aria-labelledby="wallet-title">
        <SectionTitle id="wallet-title" title={t('walletTitle')} />
        {data.wallet.length === 0 ? (
          <EmptyState title={t('walletEmpty')} />
        ) : (
          <div
            className="grid gap-4 min-[700px]:grid-cols-2 min-[1200px]:grid-cols-3"
            data-testid="voucher-wallet"
          >
            {data.wallet.map((v) => (
              <VoucherCard key={v.code} voucher={v} />
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-4" aria-labelledby="redemptions-title">
        <SectionTitle id="redemptions-title" title={t('redemptionsTitle')} />
        {data.redemptions.length === 0 ? (
          <EmptyState title={t('redemptionsEmpty')} />
        ) : (
          redemptionList(data.redemptions, 'voucher-redemptions')
        )}
      </section>

      {canIssue ? (
        <>
          <IssueVoucherForm
            organizations={data.issuing.organizations}
            teams={scope.teams}
            venues={scope.venues}
          />
          <section className="grid gap-4" aria-labelledby="issued-title">
            <SectionTitle
              id="issued-title"
              eyebrow={data.issuing.organizations.map((o) => o.name).join(' · ')}
              title={t('issuedTitle')}
            />
            {data.issuing.vouchers.length === 0 ? (
              <EmptyState title={t('issuedEmpty')} />
            ) : (
              <div
                className="grid gap-4 min-[700px]:grid-cols-2 min-[1200px]:grid-cols-3"
                data-testid="voucher-issued-list"
              >
                {data.issuing.vouchers.map((v) => (
                  <VoucherCard key={v.code} voucher={v} canRevoke />
                ))}
              </div>
            )}
            {data.issuing.redemptions.length > 0
              ? redemptionList(data.issuing.redemptions, 'voucher-issued-redemptions')
              : null}
          </section>
        </>
      ) : null}
    </main>
  );
}
