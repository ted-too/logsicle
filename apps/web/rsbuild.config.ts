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
});
