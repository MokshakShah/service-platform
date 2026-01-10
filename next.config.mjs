/** @type {import('next').NextConfig} */
import path from 'path'; // Use ES module import

const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'img.clerk.com',
      },
      {
        protocol: 'https',
        hostname: 'ucarecdn.com',
      },
    ],
  },
  devIndicators: {
    port: 4000, // Change to an unused port
  },
}

export default nextConfig
