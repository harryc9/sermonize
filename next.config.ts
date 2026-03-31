import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: false,
  logging: {
    incomingRequests: {
      ignore: [/\/api\/inngest/],
    },
  },
}

export default nextConfig
