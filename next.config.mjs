/** @type {import('next').NextConfig} */
import path from 'path'; // Use ES module import

import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const nextConfig = {
  turbopack: {
    root: __dirname,
  },
  images: {
    imageSizes: [15, 16, 32, 48, 64, 96, 128, 170, 256, 384, 600],
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
