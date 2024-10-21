/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/uploads/:path*',
        destination: '/api/serve/:path*',
      },
    ];
  },
}

module.exports = nextConfig
