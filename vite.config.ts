import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";
import solidPlugin from "vite-plugin-solid";
import devtools from "solid-devtools/vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const aiBaseUrl =
    env.AI_BASE_URL ||
    env.VITE_AI_BASE_URL ||
    env.VITE_OPENCODE_BASE_URL ||
    "https://openagent.ercloud.site/v1";
  const aiApiKey =
    env.AI_API_KEY ||
    env.VITE_AI_API_KEY ||
    env.VITE_OPENCODE_API_KEY ||
    "";
  const expenseModel = env.EXPENSE_MODEL || env.VITE_EXPENSE_MODEL || "finly";
  const marketModel = env.MARKET_MODEL || env.VITE_MARKET_MODEL || "market_quant";
  const defaultModel = env.DEFAULT_MODEL || env.VITE_DEFAULT_MODEL || "finly";

  const targetHost = aiBaseUrl.replace(/\/v1\/?$/, "").replace(/\/+$/, "") || "https://openagent.ercloud.site";

  const proxyConfig = {
    "/openagent-proxy": {
      target: targetHost,
      changeOrigin: true,
      secure: false,
      rewrite: (path: string) => path.replace(/^\/openagent-proxy/, ""),
      configure: (proxy: any) => {
        proxy.on("proxyReq", (proxyReq: any) => {
          proxyReq.removeHeader("origin");
          proxyReq.removeHeader("referer");
          if (aiApiKey) {
            proxyReq.setHeader("Authorization", `Bearer ${aiApiKey}`);
          }
        });
      },
    },
    "/opencode-proxy": {
      target: "https://opencode.ai",
      changeOrigin: true,
      secure: true,
      rewrite: (path: string) => path.replace(/^\/opencode-proxy/, ""),
      configure: (proxy: any) => {
        proxy.on("proxyReq", (proxyReq: any) => {
          if (aiApiKey) {
            proxyReq.setHeader("Authorization", `Bearer ${aiApiKey}`);
          }
        });
      },
    },
  };

  const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL || "";
  const supabaseAnonKey = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || "";

  return {
    resolve: {
      alias: {
        "solid-apexcharts": path.resolve(__dirname, "./src/components/common/SolidApexCharts.tsx"),
      },
    },
    plugins: [devtools(), solidPlugin(), tailwindcss()],
    optimizeDeps: {
      include: ["solid-js", "solid-js/store", "@solid-devtools/shared"],
    },
    server: {
      port: 3077,
      host: "0.0.0.0",
      allowedHosts: ["finlyzen.ercloud.site"],
      proxy: proxyConfig,
    },
    build: {
      target: "esnext",
    },
    preview: {
      host: "0.0.0.0",
      allowedHosts: ["finlyzen.ercloud.site"],
      proxy: proxyConfig,
    },
    define: {
      "import.meta.env.SUPABASE_URL": JSON.stringify(supabaseUrl),
      "import.meta.env.SUPABASE_ANON_KEY": JSON.stringify(supabaseAnonKey),
      "import.meta.env.AI_BASE_URL": JSON.stringify(aiBaseUrl),
      "import.meta.env.EXPENSE_MODEL": JSON.stringify(expenseModel),
      "import.meta.env.MARKET_MODEL": JSON.stringify(marketModel),
      "import.meta.env.DEFAULT_MODEL": JSON.stringify(defaultModel),
      "import.meta.env.HERMES_PROXY_CONFIGURED": JSON.stringify(Boolean(aiApiKey || aiBaseUrl)),
    },
  };
});

