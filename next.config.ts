import type { NextConfig } from "next";
const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    const privateHeaders = [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }];
    return [
      { source: "/api/:path*", headers: privateHeaders },
      { source: "/painel", headers: privateHeaders },
      { source: "/volut/entrar", headers: [...privateHeaders, { key: "Referrer-Policy", value: "no-referrer" }, { key: "Cache-Control", value: "no-store, private" }] }
    ];
  }
};
export default config;
