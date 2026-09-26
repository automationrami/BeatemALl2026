import { getTranslations } from 'next-intl/server';
import { CircleCheck, CircleX, Clock, PauseCircle } from 'lucide-react';
import { Notice } from '@beat-em-all/ui';

type Props = {
  verificationStatus: string;
  isActive: boolean;
  reviewNotes: string | null;
  /** Adds "only you can see this page" on the public page of a venue that isn't live. */
  preview?: boolean;
};

/** V-02: "Under review", "Live" (or paused) or "Rejected: reason" for the venue's managers. */
export async function VenueStatusBanner({
  verificationStatus,
  isActive,
  reviewNotes,
  preview,
}: Props) {
  const t = await getTranslations('venueOwner');
  const live = verificationStatus === 'verified';

  let icon = <Clock className="bx-icon" aria-hidden />;
  let text = t('banner.pending');
  if (live && isActive) {
    icon = <CircleCheck className="bx-icon text-positive" aria-hidden />;
    text = t('banner.live');
  } else if (live) {
    icon = <PauseCircle className="bx-icon" aria-hidden />;
    text = t('banner.paused');
  } else if (verificationStatus === 'rejected' || verificationStatus === 'suspended') {
    icon = <CircleX className="bx-icon text-negative" aria-hidden />;
    text = reviewNotes
      ? t(verificationStatus === 'rejected' ? 'banner.rejected' : 'banner.suspended', {
          reason: reviewNotes,
        })
      : t('banner.rejectedNoReason');
  }

  return (
    <div data-testid="venue-status" data-status={live && !isActive ? 'paused' : verificationStatus}>
      <Notice tone={live && isActive ? 'neutral' : 'gold'} icon={icon}>
        {text}
        {preview && !(live && isActive) ? ` ${t('banner.publicPreview')}` : null}
      </Notice>
    </div>
  );
}
