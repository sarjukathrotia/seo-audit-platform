/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["@prisma/client", "prisma", "undici", "cheerio", "robots-parser", "bullmq", "ioredis"],
};

export default nextConfig;
