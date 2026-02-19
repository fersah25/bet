import type { NextConfig } from "next";

import path from 'path';

const nextConfig: NextConfig = {
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      'encoding': false,
      '@coinbase/cdp-sdk': path.resolve(__dirname, 'src/empty-module.js'),
      '@base-org/account': path.resolve(__dirname, 'src/empty-module.js'),
    };
    return config;
  },
};

export default nextConfig;
