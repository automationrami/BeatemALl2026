import { setRequestLocale } from 'next-intl/server';
import { SignInForm } from '@/components/SignInForm';
import { AuthLayout } from '@/components/auth/AuthLayout';

type PageProps = {
  params: Promise<{ locale: string }>;
};

export default async function SignInPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <AuthLayout width="md">
      <SignInForm />
    </AuthLayout>
  );
}
