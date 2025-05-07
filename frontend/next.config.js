/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // If you're using static export
  images: {
    unoptimized: true, // This disables the image optimization API
  },
}

module.exports = nextConfig