import { defineConfig } from "@rsbuild/core";
import { pluginReact } from "@rsbuild/plugin-react";
import { pluginSourceBuild } from "@rsbuild/plugin-source-build";
import { TanStackRouterRspack } from "@tanstack/router-plugin/rspack";

export default defineConfig({
  plugins: [pluginReact(), pluginSourceBuild()],
  tools: {
    rspack: {
      plugins: [TanStackRouterRspack({ autoCodeSplitting: true })],
    },
  },
  source: {
    define: {
      // @ts-expect-error - This is a valid import
      'import.meta.env.PUBLIC_API_URL': JSON.stringify(import.meta.env.PUBLIC_API_URL),
    },
  },
});
