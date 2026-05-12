/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow file serving from /uploads for uploaded QP/answer sheets
  serverExternalPackages: ['mongoose'],
};

export default nextConfig;
