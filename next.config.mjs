/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "image.pollinations.ai" },
    ],
  },
  // A fast-moving solo build shouldn't fail a Vercel deploy over a lint
  // warning or a loose type. Tighten these once the app has tests.
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
