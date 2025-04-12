import { defineConfig } from "@rslib/core";
import { pluginNodePolyfill } from "@rsbuild/plugin-node-polyfill";

export default defineConfig({
  lib: [
    {
      format: "esm",
      syntax: "es2021",
      bundle: true,
      dts: {
        bundle: true,
        autoExtension: true,
      },
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
      dts: {
        bundle: true,
        autoExtension: true,
      },
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
          js: "worker.js",
        },
        target: "node",
      },
    },
    // Browser
    {
      format: "esm",
      syntax: "es2021",
      bundle: true,
      dts: {
        bundle: true,
        autoExtension: true,
      },
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
      dts: {
        bundle: true,
        autoExtension: true,
      },
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
          js: "worker.js",
        },
        target: "web",
      },
    },
  ],
});
