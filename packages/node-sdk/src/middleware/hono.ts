import type { MiddlewareHandler } from "hono";
import type { LogsicleClient } from "@/server-entry";
import { defaultOptions } from ".";
import type { LogsicleMiddlewareOptions } from ".";

/**
 * Logsicle middleware for Hono
 *
 * @param client LogsicleClient instance
 * @param options Middleware options
 * @returns Hono middleware
 *
 * @example
 * ```ts
 * import { Hono } from 'hono'
 * import { LogsicleClient } from '@logsicle/node-sdk'
 * import { honoLogsicleMiddleware } from '@logsicle/node-sdk/middleware'
 *
 * const logsicle = new LogsicleClient({
 *   apiKey: 'your-api-key',
 *   projectId: 'your-project-id'
 * })
 *
 * const app = new Hono()
 *
 * // Add middleware - will log all requests
 * app.use(honoLogsicleMiddleware(logsicle))
 *
 * // Access client from context
 * app.get('/api/hello', (c) => {
 *   const logger = c.get('logsicle')
 *   logger.app.info('Hello from handler!')
 *   return c.json({ message: 'hello' })
 * })
 * ```
 */
export function honoLogsicleMiddleware(
  client: LogsicleClient,
  options: LogsicleMiddlewareOptions = {}
): MiddlewareHandler {
  const mergedOptions = { ...defaultOptions, ...options };
  return async (c, next) => {
    const path = c.req.path;

    // Skip logging for paths specified in options
    if (mergedOptions.skipPaths?.includes(path)) {
      return next();
    }

    // Add client to context for easy access in route handlers
    c.set(mergedOptions.contextKey || "logsicle", client);

    const requestStartTime = Date.now();
    const method = c.req.method;

    let requestBody = undefined;
    if (mergedOptions.includeRequestBody) {
      try {
        const clonedReq = c.req.raw.clone();
        const contentType = c.req.header("content-type");
        if (contentType?.includes("application/json")) {
          requestBody = await clonedReq.json();
        }
      } catch (error) {
        // Silently fail if we can't parse request body
      }
    }

    // Process the request
    await next();

    const responseTime = Date.now() - requestStartTime;
    const status = c.res?.status || 200;

    let responseBody = undefined;
    if (mergedOptions.includeResponseBody && c.res) {
      try {
        // Clone the response to avoid consuming the original
        const resClone = c.res.clone();
        const contentType = c.res.headers.get("content-type");
        if (contentType?.includes("application/json")) {
          responseBody = await resClone.json();
        }
      } catch (error) {
        if (mergedOptions.debug) {
          console.error("[Logsicle] Error parsing response body", error);
        }
      }
    }

    // Get IP address from custom function or fallback to simple extraction
    const ipAddress = mergedOptions.getIpAddress
      ? mergedOptions.getIpAddress(c)
      : c.req.header("x-forwarded-for") ||
        c.req.header("cf-connecting-ip") ||
        "127.0.0.1";

    // Collect headers if enabled
    const headers: Record<string, string> = {};
    if (mergedOptions.includeHeaders) {
      c.req.raw.headers.forEach((value, key) => {
        headers[key] = value;
      });
    }

    // Log the request
    client.request.log({
      method,
      path,
      status_code: status,
      duration: responseTime,
      ip_address: ipAddress,
      headers,
      request_body: requestBody,
      response_body: responseBody,
      user_agent: c.req.header("user-agent"),
      host: c.req.header("host"),
    });
  };
}
