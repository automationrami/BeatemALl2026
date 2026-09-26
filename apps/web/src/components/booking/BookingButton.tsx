'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { CalendarPlus } from 'lucide-react';
import { Button } from '@beat-em-all/ui';
import { BookingModal } from './BookingModal';

type Props = {
  venueSlug: string;
  venueName: string;
  venueHourlyRateKwd: number;
  /** Games the venue supports + capacity per game. */
  supportedGames: { slug: string; name: string; seatsCount: number }[];
};

export function BookingButton({ venueSlug, venueName, venueHourlyRateKwd, supportedGames }: Props) {
  const [open, setOpen] = useState(false);
  const t = useTranslations('booking');
  return (
    <>
      <Button
        variant="gold"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        data-testid="booking-open"
      >
        <CalendarPlus className="bx-icon size-4" aria-hidden />
        {t('bookCta')}
      </Button>
      {open ? (
        <BookingModal
          venueSlug={venueSlug}
          venueName={venueName}
          venueHourlyRateKwd={venueHourlyRateKwd}
          supportedGames={supportedGames}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}
