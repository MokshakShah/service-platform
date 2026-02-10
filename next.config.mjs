/** @type {import('next').NextConfig} */
import path from 'path'; // Use ES module import

import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const nextConfig = {
  turbopack: {
    root: __dirname,
  },
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
