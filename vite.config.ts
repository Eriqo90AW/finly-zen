import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import solidPlugin from "vite-plugin-solid";
import devtools from "solid-devtools/vite";

export default defineConfig({
  plugins: [devtools(), solidPlugin(), tailwindcss()],
  optimizeDeps: {
    include: ["solid-js", "solid-js/store", "@solid-devtools/shared"],
  },
  server: {
    port: 3077,
    host: "0.0.0.0",
    allowedHosts: ["finlyzen.ercloud.site"],
    proxy: {
      "/openagent-proxy": {
        target: "https://openagent.ercloud.site",
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/openagent-proxy/, ""),
        configure: (proxy) => {
          proxy.on("proxyReq", (proxyReq) => {
            proxyReq.removeHeader("origin");
            proxyReq.removeHeader("referer");
          });
        },
      },
      "/opencode-proxy": {
        target: "https://opencode.ai",
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/opencode-proxy/, ""),
      },
    },
  },
  build: {
    target: "esnext",
  },
  preview: {
    host: "0.0.0.0",
    allowedHosts: ["finlyzen.ercloud.site"],
    proxy: {
      "/openagent-proxy": {
        target: "https://openagent.ercloud.site",
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/openagent-proxy/, ""),
        configure: (proxy) => {
          proxy.on("proxyReq", (proxyReq) => {
            proxyReq.removeHeader("origin");
            proxyReq.removeHeader("referer");
          });
        },
      },
      "/opencode-proxy": {
        target: "https://opencode.ai",
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/opencode-proxy/, ""),
      },
    },
  },
});
