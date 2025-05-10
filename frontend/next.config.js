/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true, // This disables the image optimization API
  },
}

module.exports = nextConfig