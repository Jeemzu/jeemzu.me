// Temporary config for local Better Putt Party validation; safe to delete.
import { defineConfig, mergeConfig } from "vite";
import base from "./vite.config";

export default mergeConfig(base, defineConfig({
  server: {
    port: 5174,
    strictPort: true,
    proxy: {
      "/api": {
        target: "http://localhost:5051",
        ws: true,
        configure: (proxy) => {
          proxy.on("proxyReqWs", (req) => req.setHeader("origin", "http://localhost:5173"));
          proxy.on("proxyReq", (req) => req.setHeader("origin", "http://localhost:5173"));
        },
      },
    },
  },
}));
