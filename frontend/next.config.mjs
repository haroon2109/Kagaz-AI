/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://127.0.0.1:8008/api/:path*',
      },
      {
        source: '/uploads/:path*',
        destination: 'http://127.0.0.1:8008/uploads/:path*',
      },

    ];
  },
};

export default nextConfig;
