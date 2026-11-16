import type { NextConfig } from 'next';

/**
 * Next.js 16 configuration for PulseFlow Web application.
 *
 * Configuration:
 * - TypeScript strict mode enabled
 * - ESLint integration during build
 * - Minimal configuration (framework defaults)
 *
 * Deferred Configuration (Future Implementation):
 * - Output: standalone (for Docker deployment)
 * - Environment variable validation
 * - Security headers
 * - Redirects and rewrites
 * - Image optimization domains
 */

const nextConfig: NextConfig = {
  // Enable TypeScript strict mode checks during build
  typescript: {
    // Build will fail if TypeScript errors are present
    ignoreBuildErrors: false,
  },

  // Use default server components behavior (React Server Components)
  experimental: {},
};

export default nextConfig;
