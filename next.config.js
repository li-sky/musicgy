/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  turbopack: (config, { isServer }) => {
    if (isServer) {
      // Don't bundle the netease API for server-side
      config.externals = config.externals || [];
      config.externals.push('@neteasecloudmusicapienhanced/api');
    }
    return config;
  },
}

export default nextConfig
