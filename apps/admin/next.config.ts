import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  transpilePackages: [
    '@beat-em-all/api-client',
    '@beat-em-all/design-tokens',
    '@beat-em-all/i18n',
    '@beat-em-all/mock-data',
    '@beat-em-all/types',
    '@beat-em-all/ui',
    '@beat-em-all/utils',
  ],
};

export default withNextIntl(nextConfig);
