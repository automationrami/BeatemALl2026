import { setRequestLocale } from 'next-intl/server';
import { VerifyForm } from '@/components/VerifyForm';
import { AuthLayout } from '@/components/auth/AuthLayout';

type PageProps = {
  params: Promise<{ locale: string }>;
};

export default async function VerifyPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <AuthLayout width="md">
      <VerifyForm />
    </AuthLayout>
  );
}
