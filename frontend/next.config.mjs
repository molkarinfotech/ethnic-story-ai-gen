/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: '**.supabase.in' },
    ],
  },

  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/(.*)',
        headers: [
          {
            // Prevent the site being embedded in iframes (clickjacking)
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            // Stop browsers MIME-sniffing responses away from the declared content-type
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            // Don't send the full referrer URL to third-party sites
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            // Disable browser features that the site doesn't need
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=(self)',
          },
          {
            // Force HTTPS for 1 year, include subdomains
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          {
            // Basic XSS protection for older browsers
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            // Content Security Policy
            // Adjust script-src / connect-src if you add new CDN dependencies.
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // Next.js requires 'unsafe-inline' for its inline scripts in dev; nonces are ideal but complex to add here
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://api.fontshare.com",
              "font-src 'self' https://fonts.gstatic.com https://api.fontshare.com",
              "img-src 'self' data: blob: https://*.supabase.co https://*.supabase.in https://api.dicebear.com",
              "connect-src 'self' https://*.supabase.co https://*.supabase.in https://api.stripe.com https://api-inference.huggingface.co",
              "frame-src https://js.stripe.com https://hooks.stripe.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "upgrade-insecure-requests",
            ].join('; '),
          },
        ],
      },
      {
        // Remove X-Frame-Options for the Stripe checkout iframe routes
        source: '/api/stripe-webhook',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex' },
        ],
      },
    ];
  },
};

export default nextConfig;
