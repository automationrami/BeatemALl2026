import { setRequestLocale } from 'next-intl/server';
import { OnboardingForm } from '@/components/OnboardingForm';
import { AuthLayout } from '@/components/auth/AuthLayout';

type PageProps = {
  params: Promise<{ locale: string }>;
};

export default async function OnboardingPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <AuthLayout width="lg">
      <OnboardingForm />
    </AuthLayout>
  );
}
