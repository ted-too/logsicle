import { createFetch } from "@better-fetch/fetch";
import { BASE_URL } from "@repo/api";
import { createMiddleware } from "@tanstack/react-start";
import { getHeaders, setCookie } from "@tanstack/react-start/server";

interface CookieSerializeOptions {
	domain?: string | undefined;
	encode?(value: string): string;
	expires?: Date | undefined;
	httpOnly?: boolean | undefined;
	maxAge?: number | undefined;
	path?: string | undefined;
	priority?: "low" | "medium" | "high" | undefined;
	sameSite?: true | false | "lax" | "strict" | "none" | undefined;
	secure?: boolean | undefined;
	partitioned?: boolean;
}

function parseCookieString(cookieStr: string): {
	name: string;
	value: string;
	serializeOptions?: CookieSerializeOptions;
} {
	const [nameValue, ...directives] = cookieStr.split(";").map((s) => s.trim());
	const [name, value] = nameValue.split("=").map((s) => s.trim());

	if (!directives.length) {
		return { name, value };
	}

	const options: CookieSerializeOptions = {};

	for (const directive of directives) {
		const [key, val] = directive.split("=").map((s) => s.trim());
		const keyLower = key.toLowerCase();

		switch (keyLower) {
			case "domain":
				options.domain = val;
				break;
			case "expires":
				options.expires = new Date(val);
				break;
			case "httponly":
				options.httpOnly = true;
				break;
			case "max-age":
				options.maxAge = Number.parseInt(val, 10);
				break;
			case "path":
				options.path = val;
				break;
			case "samesite":
				options.sameSite = val.toLowerCase() as "lax" | "strict" | "none";
				break;
			case "secure":
				options.secure = true;
				break;
		}
	}

	return { name, value, serializeOptions: options };
}

export const betterFetchMiddleware = createMiddleware().server(
	async ({ next }) => {
		const headers = getHeaders();

		// FIXME: This is a hack to get the pathname of the current route
		// Get the actual pathname of the caller
		const pathname = "/";

		const $fetch = createFetch({
			baseURL: BASE_URL,
			// @ts-expect-error headers are not typed
			headers: {
				"Content-Type": "application/json",
				Cookie: headers.cookie,
				Accept: headers.accept,
				"Accept-Language": headers["accept-language"],
				"User-Agent": headers["user-agent"],
				Origin: headers.origin,
				Referer: headers.referer,
			},
			onResponse: ({ response }) => {
				const cookies = response.headers.getSetCookie();
				for (const cookie of cookies) {
					const { name, value, serializeOptions } = parseCookieString(cookie);
					setCookie(name, value, serializeOptions);
				}
			},
			onError: (error) => {
				console.log(error.error);
				// if (error.response.status === 401) {
				//   throw redirect({
				//     to: "/",
				//   });
				// }
			},
		});

		return await next({ context: { $fetch } });
	},
);
