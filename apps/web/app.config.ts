import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "@tanstack/react-start/config";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  tsr: {
    appDirectory: "src",
  },
  vite: {
    plugins: [
      tsConfigPaths({
        projects: ["./tsconfig.json"],
      }),
      tailwindcss(),
    ],
    define: {
      // FIXME: This is a hack to get the API URL to work on client side
      // Find a better way to do this probably when start gets nitro support
      "import.meta.env.VITE_API_URL": JSON.stringify(process.env.VITE_API_URL),
    },
  },
});
