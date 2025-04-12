import type { Context } from "hono";

/**
 * Options for the Logsicle middleware
 */
export interface LogsicleMiddlewareOptions {
	/**
	 * Skip logging for certain paths
	 */
	skipPaths?: string[];
	/**
	 * Custom function to extract IP address from the request
	 */
	getIpAddress?: (c: Context) => string;
	/**
	 * Include request headers in logs (default: false)
	 */
	includeHeaders?: boolean;
	/**
	 * Include request body in logs (default: false)
	 */
	includeRequestBody?: boolean;
	/**
	 * Include response body in logs (default: false)
	 */
	includeResponseBody?: boolean;
	/**
	 * Key to set client instance on context
	 * @default 'logsicle'
	 */
	contextKey?: string;
	/**
	 * Enable debug mode to log internal errors
	 */
	debug?: boolean;
}

export const defaultOptions: LogsicleMiddlewareOptions = {
	skipPaths: [],
	includeHeaders: false,
	includeRequestBody: false,
	includeResponseBody: false,
	contextKey: "logsicle",
	debug: false,
};

export * from "./hono";
