import { defineConfig } from "@rslib/core";
import { pluginNodePolyfill } from "@rsbuild/plugin-node-polyfill";

export default defineConfig({
  lib: [
    // Shared types bundle
    {
      format: "esm",
      syntax: "es2021",
      bundle: true,
      dts: {
        bundle: true,
        autoExtension: true,
      },
      source: {
        entry: { index: "./src/types-entry.ts" },
      },
      output: {
        distPath: {
          root: "./dist/types",
        },
      },
    },
    {
      format: "cjs",
      syntax: "es2021",
      bundle: true,
      dts: {
        bundle: true,
        autoExtension: true,
      },
      source: {
        entry: { index: "./src/types-entry.ts" },
      },
      output: {
        distPath: {
          root: "./dist/types",
        },
      },
    },
    // Middleware
    {
      format: "esm",
      syntax: "es2021",
      bundle: true,
      dts: false,
      source: {
        entry: { index: "./src/middleware/index.ts" },
      },
      output: {
        distPath: {
          root: "./dist/middleware",
        },
        target: "node",
      },
    },
    {
      format: "cjs",
      syntax: "es2021",
      bundle: true,
      dts: false,
      source: {
        entry: { index: "./src/middleware/index.ts" },
      },
      output: {
        distPath: {
          root: "./dist/middleware",
        },
        target: "node",
      },
    },
    // Server
    {
      format: "esm",
      syntax: "es2021",
      bundle: true,
      dts: false,
      source: {
        entry: { index: "./src/server-entry.ts" },
      },
      output: {
        distPath: {
          root: "./dist/server",
        },
        target: "node",
      },
    },
    {
      format: "cjs",
      syntax: "es2021",
      bundle: true,
      dts: false,
      source: {
        entry: { index: "./src/server-entry.ts" },
      },
      output: {
        distPath: {
          root: "./dist/server",
        },
        target: "node",
      },
    },
    {
      format: "cjs",
      syntax: "es2021",
      source: {
        entry: { index: "./src/server/worker.ts" },
      },
      output: {
        distPath: {
          root: "./dist/server",
        },
        filename: {
          js: "logsicle-worker.js",
        },
        target: "node",
      },
    },
    // Browser
    {
      format: "esm",
      syntax: "es2021",
      bundle: true,
      dts: false,
      source: {
        entry: { index: "./src/browser-entry.ts" },
      },
      output: {
        distPath: {
          root: "./dist/browser",
        },
        target: "web",
      },
      plugins: [pluginNodePolyfill({ include: ["events"] })],
    },
    {
      format: "cjs",
      syntax: "es2021",
      bundle: true,
      dts: false,
      source: {
        entry: { index: "./src/browser-entry.ts" },
      },
      output: {
        distPath: {
          root: "./dist/browser",
        },
        target: "web",
      },
      plugins: [pluginNodePolyfill({ include: ["events"] })],
    },
    {
      format: "cjs",
      syntax: "es2021",
      source: {
        entry: { index: "./src/browser/worker.ts" },
      },
      output: {
        distPath: {
          root: "./dist/browser",
        },
        filename: {
          js: "logsicle-worker.js",
        },
        target: "web",
      },
    },
  ],
});
