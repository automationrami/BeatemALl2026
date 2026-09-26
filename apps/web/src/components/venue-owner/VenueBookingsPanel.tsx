'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { Clock, StickyNote, Users } from 'lucide-react';
import { Tag, TeamCrest } from '@beat-em-all/ui';
import { BookingStatusTag } from '@/components/booking/BookingStatusTag';
import { VenueBookingActions, type VenueAction } from './VenueBookingActions';

/** One booking, pre-formatted on the server (Kuwait time, viewer's language). */
export type ManagerBookingRow = {
  id: string;
  status: string;
  statusLabel: string;
  teamName: string;
  teamTag: string;
  teamColor: string;
  gameName: string;
  dayLabel: string;
  monthLabel: string;
  timeLabel: string;
  seatsCount: number;
  totalLabel: string;
  notes: string | null;
  cancellationReason: string | null;
  isUpcoming: boolean;
  isToday: boolean;
  actions: VenueAction[];
};

type Filter = 'upcoming' | 'today' | 'past' | 'all';
const FILTERS: Filter[] = ['upcoming', 'today', 'past', 'all'];

/** V-04: the venue's bookings with filter chips and per-booking actions (V-05 / V-06). */
export function VenueBookingsPanel({ rows }: { rows: ManagerBookingRow[] }) {
  const t = useTranslations('venueOwner');
  const locale = useLocale();
  const [filter, setFilter] = useState<Filter>('upcoming');

  const matches = (r: ManagerBookingRow) =>
    filter === 'all'
      ? true
      : filter === 'today'
        ? r.isToday
        : filter === 'upcoming'
          ? r.isUpcoming
          : !r.isUpcoming;
  // Upcoming reads soonest first; everything else newest first (server order).
  const shown = rows.filter(matches);
  if (filter === 'upcoming' || filter === 'today') shown.reverse();

  const count = (f: Filter) =>
    rows.filter((r) =>
      f === 'all'
        ? true
        : f === 'today'
          ? r.isToday
          : f === 'upcoming'
            ? r.isUpcoming
            : !r.isUpcoming,
    ).length;

  return (
    <div className="grid gap-4" data-testid="venue-bookings">
      <div className="bx-seg self-start" role="group" aria-label={t('manage.bookingsTitle')}>
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={filter === f}
            onClick={() => setFilter(f)}
            data-testid={`venue-bookings-filter-${f}`}
          >
            {t(`manage.filter.${f}`)} · {count(f)}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="bx-card bx-card--flat p-6 text-[14px] text-ink-muted">
          {t('manage.empty')}
        </div>
      ) : (
        <ul className="m-0 grid list-none gap-3 p-0">
          {shown.map((r) => (
            <li
              key={r.id}
              className="bx-card bx-card--flat grid gap-4 p-4 sm:px-5"
              data-testid={`venue-booking-${r.id}`}
            >
              <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4 sm:grid-cols-[auto_minmax(0,1fr)_auto]">
                <div className="bx-inset grid w-16 justify-items-center gap-1 py-2.5">
                  <span className="bx-eyebrow">{r.monthLabel}</span>
                  <span className="bx-num text-[28px] text-ink">{r.dayLabel}</span>
                </div>
                <div className="grid min-w-0 gap-1.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <BookingStatusTag status={r.status} label={r.statusLabel} />
                    <Tag>{r.gameName}</Tag>
                  </div>
                  <Link
                    href={`/${locale}/bookings/${r.id}`}
                    className="flex min-w-0 items-center gap-2 font-display text-[18px] font-bold leading-[22px] text-ink hover:text-gold-text"
                  >
                    <TeamCrest tag={r.teamTag} color={r.teamColor} size={28} />
                    <span className="truncate">{r.teamName}</span>
                  </Link>
                  <p className="m-0 flex flex-wrap items-center gap-x-4 gap-y-1 font-display text-[13px] font-medium text-ink-muted">
                    <span className="inline-flex items-center gap-1.5 tabular-nums">
                      <Clock className="bx-icon size-3.5" aria-hidden />
                      {r.timeLabel}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Users className="bx-icon size-3.5" aria-hidden />
                      {t('manage.rowSeats', { count: r.seatsCount })}
                    </span>
                  </p>
                </div>
                <span className="bx-num col-span-2 text-[22px] text-ink sm:col-span-1 sm:text-end">
                  {r.totalLabel}
                </span>
              </div>
              {r.notes ? (
                <p className="m-0 flex items-start gap-2 text-[13px] text-ink-muted">
                  <StickyNote className="bx-icon mt-0.5 size-3.5 shrink-0" aria-hidden />
                  {r.notes}
                </p>
              ) : null}
              {r.cancellationReason ? (
                <p className="m-0 text-[13px] text-ink-muted">
                  {t('teamCancel.cancelledReason', { reason: r.cancellationReason })}
                </p>
              ) : null}
              <VenueBookingActions bookingId={r.id} actions={r.actions} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
