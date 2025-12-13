import { defineConfig } from "vite";

export default defineConfig({
  base: '/family_icecream_location/',
  server: {
    host: true, // Listen on all local IPs (0.0.0.0)
    port: 5173,
    strictPort: true, // Fail if port is busy
  },
});
