import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow phone/LAN access in local development (http://192.168.x.x:3000)
  allowedDevOrigins: ["192.168.1.3", "127.0.0.1", "localhost"],
};

export default nextConfig;
