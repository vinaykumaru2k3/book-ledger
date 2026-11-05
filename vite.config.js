import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 800, // the Firebase SDK chunk is ~725 kB and cannot be split further
    rollupOptions: {
      output: {
        // Keep the big, rarely changing SDK in its own cacheable chunk.
        manualChunks: { firebase: ["firebase/app", "firebase/auth", "firebase/firestore", "firebase/analytics"] },
      },
    },
  },
});
