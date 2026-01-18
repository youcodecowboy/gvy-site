/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Exclude pdf-parse from webpack bundling due to pdfjs-dist compatibility issues
    serverComponentsExternalPackages: ['pdf-parse', 'pdfjs-dist'],
  },
}

export default nextConfig
