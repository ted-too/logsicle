import { createMiddleware } from "@tanstack/react-start";
import { createFetch } from "@better-fetch/fetch";
import { getHeaders } from "@tanstack/react-start/server";
import { betterFetchSchema } from "@repo/api";
import { redirect } from "@tanstack/react-router";

export const betterFetchMiddleware = createMiddleware().server(
  async ({ next }) => {
    const headers = getHeaders() as HeadersInit;

    // FIXME: This is a hack to get the pathname of the current route
    // Get the actual pathname of the caller
    const pathname = "/";

    const $fetch = createFetch({
      baseURL: import.meta.env.VITE_API_URL,
      headers,
      schema: betterFetchSchema,
      onError: (error) => {
        if (error.response.status === 401) {
          throw redirect({
            href: `${import.meta.env.VITE_API_URL}/v1/auth/sign-in${pathname === "/" ? "" : `?redirect=${encodeURIComponent(location.pathname)}`}`,
          });
        }
      },
    });
    return await next({ context: { $fetch } });
  }
);
