import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "@tanstack/react-start/config";
import tsConfigPaths from "vite-tsconfig-paths";

console.log(process.env);

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
			"import.meta.env.VITE_PUBLIC_API_URL": JSON.stringify(process.env.VITE_PUBLIC_API_URL),
		}
	},
});
