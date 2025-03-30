import { createFetch } from "@better-fetch/fetch";

export * from "./types";
export * from "./routes";
export * from "./validations";

export const BASE_URL = import.meta.env.VITE_PUBLIC_API_URL || process.env.VITE_PUBLIC_API_URL;

export const createClient = () =>
	createFetch({
		baseURL: BASE_URL,
		credentials: "include",
		headers: {
			"Content-Type": "application/json",
		},
	});
