import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: false,
  logging: {
    incomingRequests: {
      ignore: [/\/api\/inngest/],
    },
  },
  serverExternalPackages: ['@napi-rs/canvas', 'pdfjs-dist'],
  experimental: {
    serverComponentsHmrCache: false,
  }
}

export default nextConfig
