import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react()],
    define: {
      __VITE_ENV__: env,
    },
    server: {
      proxy: {
        "/storage": {
          target: "https://firebasestorage.googleapis.com",
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/storage/, ""),
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET,PUT,POST,DELETE,OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
          },
        },
      },
    },
  };
});
