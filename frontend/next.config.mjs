/** @type {import('next').NextConfig} */
const API_ORIGIN = process.env.NEXT_PUBLIC_API_ORIGIN || "http://127.0.0.1:8000";

const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${API_ORIGIN}/api/:path*`,
      },
      {
        source: '/uploads/:path*',
        destination: `${API_ORIGIN}/uploads/:path*`,
      },

    ];
  },
};

export default nextConfig;
