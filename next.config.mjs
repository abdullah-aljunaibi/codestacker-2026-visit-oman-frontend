/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "experienceoman.om"
      }
    ]
  }
};

export default nextConfig;
