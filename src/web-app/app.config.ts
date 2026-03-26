import { defineConfig } from "@solidjs/start/config";

export default defineConfig({
  vite: {
    resolve: {
      alias: {
        "~": "/src",
        "@layouts": "/src/components/layouts",
        "@components": "/src/components",
        "@dialogs": "/src/components/dialogs",
        "@shared": "/src/shared",
      },
    },
  },
});
