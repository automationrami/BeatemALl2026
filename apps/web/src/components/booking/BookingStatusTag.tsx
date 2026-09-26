import { CircleCheck, CircleX, Clock, Flag } from 'lucide-react';
import { Tag } from '@beat-em-all/ui';

export type BookingStatusKey =
  | 'statusPendingPayment'
  | 'statusConfirmed'
  | 'statusCheckedIn'
  | 'statusCompleted'
  | 'statusCancelled'
  | 'statusNoShow';

/** `pending_payment` -> `statusPendingPayment` (the `booking` namespace key). */
export function bookingStatusKey(status: string): BookingStatusKey {
  return `status${status
    .split('_')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join('')}` as BookingStatusKey;
}

/** Status chip: gold-soft while payment is pending, green once confirmed, red when it fell through. */
export function BookingStatusTag({ status, label }: { status: string; label: string }) {
  if (status === 'confirmed' || status === 'checked_in') {
    return (
      <Tag
        className="bg-positive-soft text-positive"
        icon={<CircleCheck className="bx-icon" aria-hidden />}
      >
        {label}
      </Tag>
    );
  }
  if (status === 'cancelled' || status === 'no_show') {
    return (
      <Tag
        className="bg-negative-soft text-negative"
        icon={<CircleX className="bx-icon" aria-hidden />}
      >
        {label}
      </Tag>
    );
  }
  if (status === 'completed') {
    return <Tag icon={<Flag className="bx-icon" aria-hidden />}>{label}</Tag>;
  }
  return (
    <Tag tone="soft" icon={<Clock className="bx-icon" aria-hidden />}>
      {label}
    </Tag>
  );
}
