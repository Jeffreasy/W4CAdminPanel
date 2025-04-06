/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.prod.website-files.com',
        // Optionally, you can specify port and pathname if needed
        // port: '',
        // pathname: '/account123/**',
      },
      // Add other trusted hostnames here if necessary
    ],
  },
}

module.exports = nextConfig 