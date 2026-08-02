import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // Prod Docker image (backend/frontend/Dockerfile) faqat shu papkani
  // nusxalaydi — node_modules'siz kichik runtime (docs/11-devops.md D2).
  output: "standalone",
};

export default withNextIntl(nextConfig);
