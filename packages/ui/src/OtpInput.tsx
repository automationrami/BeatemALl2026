'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';

type OtpInputProps = {
  value: string;
  onChange: (next: string) => void;
  length?: number;
  /** Auto-focus the first slot on mount. */
  autoFocus?: boolean;
  invalid?: boolean;
  onComplete?: (code: string) => void;
};

/**
 * 6-digit segmented OTP input.
 * - Each slot accepts a single digit and auto-advances focus.
 * - Backspace on an empty slot moves focus back.
 * - Pasting a 6-digit code populates all slots at once.
 */
export function OtpInput({
  value,
  onChange,
  length = 6,
  autoFocus,
  invalid,
  onComplete,
}: OtpInputProps) {
  const id = useId();
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = useMemo(() => {
    const arr = value.split('');
    while (arr.length < length) arr.push('');
    return arr.slice(0, length);
  }, [value, length]);

  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus();
  }, [autoFocus]);

  useEffect(() => {
    if (value.length === length) onComplete?.(value);
  }, [value, length, onComplete]);

  function setDigit(idx: number, char: string) {
    const cleaned = char.replace(/\D/g, '').slice(0, 1);
    const next = digits.slice();
    next[idx] = cleaned;
    onChange(next.join(''));
    if (cleaned && idx < length - 1) {
      refs.current[idx + 1]?.focus();
      setActiveIdx(idx + 1);
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (!pasted) return;
    onChange(pasted.padEnd(length, '').slice(0, length).trimEnd());
    const lastIdx = Math.min(pasted.length - 1, length - 1);
    refs.current[lastIdx]?.focus();
    setActiveIdx(lastIdx);
  }

  function handleKey(idx: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      e.preventDefault();
      const next = digits.slice();
      next[idx - 1] = '';
      onChange(next.join(''));
      refs.current[idx - 1]?.focus();
      setActiveIdx(idx - 1);
    } else if (e.key === 'ArrowLeft' && idx > 0) {
      e.preventDefault();
      refs.current[idx - 1]?.focus();
      setActiveIdx(idx - 1);
    } else if (e.key === 'ArrowRight' && idx < length - 1) {
      e.preventDefault();
      refs.current[idx + 1]?.focus();
      setActiveIdx(idx + 1);
    }
  }

  return (
    <div
      className="grid gap-2 w-full"
      style={{ gridTemplateColumns: `repeat(${length}, minmax(0, 1fr))` }}
      role="group"
      aria-label="One-time code"
    >
      {digits.map((d, idx) => {
        const filled = !!d;
        const focused = activeIdx === idx;
        const slotState = invalid
          ? 'border-[rgba(251,113,133,0.45)] bg-[rgba(251,113,133,0.10)]'
          : filled
            ? 'border-[rgba(139,92,246,0.45)] bg-[rgba(139,92,246,0.12)]'
            : focused
              ? 'border-[rgba(255,255,255,0.25)] bg-[rgba(255,255,255,0.04)]'
              : 'border-[var(--line-2)] bg-[rgba(255,255,255,0.03)]';
        return (
          <input
            key={`${id}-${idx}`}
            ref={(el) => {
              refs.current[idx] = el;
            }}
            inputMode="numeric"
            autoComplete={idx === 0 ? 'one-time-code' : 'off'}
            maxLength={1}
            size={1}
            value={d}
            onChange={(e) => setDigit(idx, e.target.value)}
            onKeyDown={(e) => handleKey(idx, e)}
            onPaste={handlePaste}
            onFocus={() => setActiveIdx(idx)}
            aria-label={`Digit ${idx + 1}`}
            className={[
              'w-full min-w-0 h-14 text-center text-2xl font-display font-medium text-white rounded-xl border transition-colors',
              'outline-none focus:ring-0',
              slotState,
            ].join(' ')}
          />
        );
      })}
    </div>
  );
}
