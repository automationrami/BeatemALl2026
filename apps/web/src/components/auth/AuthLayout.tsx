import { Wordmark } from '@beat-em-all/ui';
import { LanguageToggle } from '@/components/LanguageToggle';

type AuthLayoutProps = {
  children: React.ReactNode;
  /** Panel width: `md` for sign-in / verify, `lg` for onboarding pickers. */
  width?: 'md' | 'lg';
  /** Render children bare instead of inside the card panel (e.g. the callback loader). */
  bare?: boolean;
};

/**
 * Full-screen frame for the auth and onboarding routes, which render without the app
 * shell: language switch at the top end, the large wordmark, and one centred card panel.
 */
export function AuthLayout({ children, width = 'md', bare }: AuthLayoutProps) {
  return (
    <div className="grid min-h-dvh grid-rows-[auto_1fr] bg-surface-000 text-ink">
      <div className="flex justify-end px-4 pt-4 min-[900px]:px-8 min-[900px]:pt-6">
        <LanguageToggle />
      </div>
      <main className="grid content-center justify-items-center gap-8 px-4 pt-6 pb-12 min-[900px]:gap-10 min-[900px]:pb-16">
        <Wordmark size={56} />
        {bare ? (
          children
        ) : (
          <section
            className={[
              'bx-card w-full p-6 min-[600px]:p-8',
              width === 'lg' ? 'max-w-[720px]' : 'max-w-[460px]',
            ].join(' ')}
          >
            {children}
          </section>
        )}
      </main>
    </div>
  );
}
