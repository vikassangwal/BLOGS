import type { NextConfig } from "next";
// @ts-ignore
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  turbopack: {},
  // @ts-ignore
  typescript: {
    ignoreBuildErrors: true,
  },
  // @ts-ignore
  eslint: {
    ignoreDuringBuilds: true,
  },
  compress: true,
  async redirects() {
    return [
      { source: '/blogs', destination: '/blog', permanent: true },
      { source: '/blogging', destination: '/blog', permanent: true },
      { source: '/bloging', destination: '/blog', permanent: true },
      { source: '/articles', destination: '/blog', permanent: true },
      { source: '/posts', destination: '/blog', permanent: true },
      { source: '/sarkari-result', destination: '/blog?jobType=result', permanent: true },
      { source: '/sarkari-results', destination: '/blog?jobType=result', permanent: true },
      { source: '/results', destination: '/blog?jobType=result', permanent: true },
      { source: '/result', destination: '/blog?jobType=result', permanent: true },
      { source: '/admit-card', destination: '/blog?jobType=admit_card', permanent: true },
      { source: '/admit-cards', destination: '/blog?jobType=admit_card', permanent: true },
      { source: '/latest-jobs', destination: '/blog?jobType=active', permanent: true },
      { source: '/jobs', destination: '/blog?jobType=active', permanent: true },
      { source: '/sarkari-naukri', destination: '/blog?jobType=active', permanent: true },
      { source: '/tech', destination: '/blog?tag=Technology', permanent: true },
      { source: '/technology', destination: '/blog?tag=Technology', permanent: true },
      { source: '/finance', destination: '/blog?tag=Finance%20%26%20Earning', permanent: true },
      { source: '/privacy', destination: '/privacy-policy', permanent: true },
      { source: '/terms', destination: '/terms-of-service', permanent: true },
    ];
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 86400,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'image.pollinations.ai',
      },
      {
        protocol: 'https',
        hostname: 'images.pexels.com',
      },
      {
        protocol: 'https',
        hostname: 'cdn.pixabay.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },
};

export default withPWA(nextConfig);
