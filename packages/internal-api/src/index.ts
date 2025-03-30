import { createFetch } from "@better-fetch/fetch";

export * from "./types";
export * from "./routes";
export * from "./validations";

// On server we use process.env.VITE_PUBLIC_API_URL
// On client we use import.meta.env.VITE_PUBLIC_API_URL - But this is broken should be fixed when start gets nitro support
export const BASE_URL = import.meta.env.VITE_PUBLIC_API_URL || process.env.VITE_PUBLIC_API_URL;

export const createClient = () =>
	createFetch({
		baseURL: BASE_URL,
		credentials: "include",
		headers: {
			"Content-Type": "application/json",
		},
	});
