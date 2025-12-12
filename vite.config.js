import { defineConfig } from "vite";

export default defineConfig({
  server: {
    host: true, // Listen on all local IPs (0.0.0.0)
    port: 5173,
    strictPort: true, // Fail if port is busy
  },
});
