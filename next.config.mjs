/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@sparticuz/chromium', 'puppeteer-core'],
    serverActions: {
      bodySizeLimit: '15mb',
    },
  },
}

export default nextConfig
