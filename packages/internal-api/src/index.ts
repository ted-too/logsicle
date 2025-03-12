import { createFetch } from "@better-fetch/fetch";

export * from "./types";
export * from "./routes";
export * from "./validations";

export const $fetch = createFetch({
  baseURL: import.meta.env.VITE_API_URL,
  credentials: "include",
  // retry: {
  //   type: "linear",
  //   attempts: 3,
  //   delay: 1000,
  // },
});
