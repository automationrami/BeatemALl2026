'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
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
      <Button tone="primary" size="md" onClick={() => setOpen(true)}>
        {t('bookCta')} →
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
