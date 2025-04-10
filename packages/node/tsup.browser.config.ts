import { defineConfig } from "tsup";

export default defineConfig([
	// BROWSER BUILDS
	// Browser main entry point
	{
		entry: {
			"browser-entry": "src/browser-entry.ts",
		},
		format: ["cjs", "esm"],
		dts: true,
		sourcemap: true,
		clean: true,
		treeshake: true,
		skipNodeModulesBundle: true,
		splitting: false,
		outExtension: ({ format }) => ({ js: `.${format}.js` }),
		// Important: exclude Node.js modules from browser builds
		external: ["node:*"],
	},
	{
		entry: {
			"browser-worker": "src/browser/worker.ts",
		},
		format: ["iife"],
		sourcemap: true,
		clean: false,
		treeshake: true,
		skipNodeModulesBundle: true,
		minify: true,
		external: ["node:*"],
		globalName: "LogsicleWorker",
		outExtension: () => ({ js: ".js" }),
	},
	// // SERVER BUILDS
	// // Server main entry point
	// {
	//   entry: {
	//     "server-entry": "src/server-entry.ts",
	//   },
	//   format: ["cjs", "esm"],
	//   dts: true,
	//   sourcemap: true,
	//   clean: false,
	//   treeshake: true,
	//   skipNodeModulesBundle: true,
	//   splitting: false,
	//   outExtension: ({ format }) => ({ js: `.${format}.js` }),
	//   platform: "node",
	// },

	// // Server worker bundle
	// {
	//   entry: {
	//     "server-worker": "src/server/worker.ts",
	//   },
	//   format: ["iife"],
	//   sourcemap: true,
	//   clean: false,
	//   treeshake: true,
	//   skipNodeModulesBundle: true,
	//   minify: true,
	//   platform: "node",
	//   globalName: "LogsicleWorker",
	//   outExtension: () => ({ js: ".js" }),
	//   plugins: [nodePolyfills({ include: ["crypto"] })],
	// },
]);
