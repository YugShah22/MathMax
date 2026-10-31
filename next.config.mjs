/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow file serving from /uploads for uploaded QP/answer sheets
  serverExternalPackages: ['mongoose'],
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${process.env.FASTAPI_URL || 'http://127.0.0.1:8000'}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
