import { createFetch, createSchema } from "@better-fetch/fetch";
import {
  updateUserSchema,
  createAPIKeySchema,
  createChannelSchema,
  updateChannelSchema,
  listEventsSchema,
  getEventMetricsSchema,
  listAppLogsSchema,
  getAppMetricsSchema,
} from "@/routes";

export * from "./types";
export * from "./routes";
// export * from "./validations";

export const BASE_URL = import.meta.env.VITE_API_URL;
export const createClient = () =>
  createFetch({
    baseURL: BASE_URL,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
  });

export const betterFetchSchema = createSchema({
  // User routes
  "@get/v1/me": {},
  "@patch/v1/me": {
    input: updateUserSchema,
  },

  // Project API Keys
  "@post/v1/projects/:id/api-keys": {
    input: createAPIKeySchema,
  },
  "@get/v1/projects/:id/api-keys": {},
  "@delete/v1/projects/:id/api-keys/:keyId": {},

  // Event Logs
  "@get/v1/projects/:id/events": {
    input: listEventsSchema,
  },
  "@delete/v1/projects/:id/events/:eventId": {},
  "@get/v1/projects/:id/events/metrics": {
    input: getEventMetricsSchema,
  },

  // Event Channels
  "@post/v1/projects/:id/events/channels": {
    input: createChannelSchema,
  },
  "@get/v1/projects/:id/events/channels": {},
  "@get/v1/projects/:id/events/channels/:channelId": {},
  "@patch/v1/projects/:id/events/channels/:channelId": {
    input: updateChannelSchema,
  },
  "@delete/v1/projects/:id/events/channels/:channelId": {},

  // App Logs
  "@get/v1/projects/:id/app": {
    input: listAppLogsSchema,
  },
  "@delete/v1/projects/:id/app/:logId": {},
  "@get/v1/projects/:id/app/metrics": {
    input: getAppMetricsSchema,
  },
});
