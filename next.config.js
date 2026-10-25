/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**.supabase.co" }],
  },
  webpack: (config) => {
    // Konva ships a Node build (index-node.js) that requires the native
    // `canvas` package. It's only ever imported from "use client"
    // components in the browser, so tell webpack's server compiler to
    // treat it as an external instead of trying to resolve/bundle it.
    config.externals = [...(config.externals ?? []), { canvas: "commonjs canvas" }];
    return config;
  },
};

module.exports = nextConfig;
