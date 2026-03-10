import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  serverExternalPackages: ["archiver"],
  experimental: {
    serverActions: {
      bodySizeLimit: "10gb",
    },
  },
};

export default withNextIntl(nextConfig);
