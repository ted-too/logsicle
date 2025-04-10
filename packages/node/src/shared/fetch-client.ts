import { createFetch } from "@better-fetch/fetch";
import type { LogsicleConfig } from "@/types";

export function createFetchClient(config: LogsicleConfig) {
  const baseURL = `${
    config.endpoint !== undefined
      ? `${config.endpoint.apiUrl}/v${config.endpoint.v || 1}`
      : "https://api.logsicle.com/v1"
  }/ingest`;

  return createFetch({
    baseURL,
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
      Accept: "text/plain, application/json",
    },
    // This is handled by the queue manager
    retry: 0,
  });
}
