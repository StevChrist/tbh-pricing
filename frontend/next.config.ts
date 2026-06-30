/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  images: {
    domains: ["community.cloudflare.steamstatic.com", "steamcommunity-a.akamaihd.net"],
  },
};

export default nextConfig;
