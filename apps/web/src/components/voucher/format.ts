import { formatAmount } from '@/components/booking/format';

/** "KWD 24" / "24 د.ك" through the namespace's `money` key (Western digits in both). */
export function formatKwd(
  amount: number,
  t: (key: 'money', values: { amount: string }) => string,
): string {
  return t('money', { amount: formatAmount(amount) });
}
