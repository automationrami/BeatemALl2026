import { History } from 'lucide-react';

type SectionTitleProps = {
  title: React.ReactNode;
  eyebrow?: React.ReactNode;
  actions?: React.ReactNode;
  as?: 'h1' | 'h2' | 'h3';
  id?: string;
};

/** Section title in the 42px display style, with actions on the far side. */
export function SectionTitle({ title, eyebrow, actions, as: H = 'h2', id }: SectionTitleProps) {
  return (
    <div className="bx-section-title">
      <div>
        {eyebrow && <div className="bx-section-title__eyebrow">{eyebrow}</div>}
        <H id={id}>{title}</H>
      </div>
      {actions && <div className="bx-toolbar">{actions}</div>}
    </div>
  );
}

type PageHeadProps = {
  /** Eyebrow parts, joined by hairline separators. The last may be emphasised as muted. */
  eyebrow?: React.ReactNode[];
  title: React.ReactNode;
  description?: React.ReactNode;
  aside?: React.ReactNode;
  children?: React.ReactNode;
};

/** The header card at the top of list and ranking pages: eyebrow, title, description, aside. */
export function PageHead({ eyebrow, title, description, aside, children }: PageHeadProps) {
  return (
    <section className="bx-card">
      <div className="bx-pagehead">
        {aside && <div className="bx-pagehead__aside">{aside}</div>}
        {eyebrow && eyebrow.length > 0 && (
          <div className="bx-pagehead__eyebrow">
            {eyebrow.map((part, i) => (
              <span key={i} className="contents">
                {i > 0 && <i aria-hidden />}
                <span>{part}</span>
              </span>
            ))}
          </div>
        )}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {children}
    </section>
  );
}

type StatItem = {
  label: React.ReactNode;
  value: React.ReactNode;
  of?: React.ReactNode;
  tone?: 'gold';
};

/** Row of big numbers with small labels; at most two gold numerals per strip. */
export function StatStrip({ items, bordered }: { items: StatItem[]; bordered?: boolean }) {
  return (
    <div className={['bx-stats', bordered ? 'bx-stats--bordered' : ''].join(' ')}>
      {items.map((it, i) => (
        <div key={i} className="bx-stat">
          <div className={['bx-stat__value', it.tone === 'gold' ? 'bx-gold-num' : ''].join(' ')}>
            {it.value}
            {it.of !== undefined && <small>/{it.of}</small>}
          </div>
          <div className="bx-stat__label">{it.label}</div>
        </div>
      ))}
    </div>
  );
}

type NoticeProps = {
  tone?: 'gold' | 'neutral';
  icon?: React.ReactNode;
  mark?: React.ReactNode;
  children: React.ReactNode;
};

/** One-sentence rule or explanation under a table or form. */
export function Notice({ tone = 'gold', icon, mark, children }: NoticeProps) {
  return (
    <div
      className={['bx-notice', tone === 'neutral' ? 'bx-notice--neutral' : ''].join(' ')}
      role="note"
    >
      {mark ? <span className="bx-notice__mark">{mark}</span> : icon}
      <span>{children}</span>
    </div>
  );
}

/** The gold season chip for ranking and profile headers (display only until seasons are selectable). */
export function SeasonChip({ label, value }: { label: string; value: string }) {
  return (
    <span className="bx-season">
      <span className="block">
        <span>{label}</span>
        <b>{value}</b>
      </span>
      <i>
        <History className="bx-icon" aria-hidden />
      </i>
    </span>
  );
}

/** Empty state inside a card: one line of text and an optional action. */
export function EmptyState({
  title,
  body,
  action,
}: { title: React.ReactNode; body?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="bx-card bx-card--flat grid justify-items-start gap-3 p-6">
      <p className="font-display text-[18px] font-bold text-ink">{title}</p>
      {body && <p className="max-w-[60ch] text-[14px] text-ink-muted">{body}</p>}
      {action}
    </div>
  );
}
