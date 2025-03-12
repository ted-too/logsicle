/* eslint-disable react-hooks/rules-of-hooks */
import {
  type CreateEventChannelRequest,
  type CreateAppLogChannelRequest,
  type CreateRequestChannelRequest,
  type CreateTraceChannelRequest,
  createEventChannel,
  createAppLogChannel,
  createRequestChannel,
  createTraceChannel,
} from "@repo/api";
import { useMutation } from "@tanstack/react-query";
import { getQueryClient } from "../query-client";

const queryClient = getQueryClient();

export const createChannelsMutations = {
  // Event Channels
  event: {
    create: () =>
      useMutation({
        mutationFn: async ({
          projectId,
          ...data
        }: CreateEventChannelRequest & { projectId: string }) => {
          const { data: channel, error } = await createEventChannel(
            projectId,
            data,
            {
              baseURL: import.meta.env.VITE_API_URL!,
            }
          );
          if (error) return Promise.reject(error);
          return channel;
        },
        onSuccess: (_data, { projectId }) => {
          // Invalidate relevant queries
          queryClient.invalidateQueries({
            queryKey: ["projects", projectId],
          });
          queryClient.invalidateQueries({
            queryKey: ["projects", projectId, "channels", "event"],
          });
        },
      }),
  },

  // App Log Channels
  app: {
    create: () =>
      useMutation({
        mutationFn: async ({
          projectId,
          ...data
        }: CreateAppLogChannelRequest & { projectId: string }) => {
          const { data: channel, error } = await createAppLogChannel(
            projectId,
            data,
            {
              baseURL: import.meta.env.VITE_API_URL!,
            }
          );
          if (error) return Promise.reject(error);
          return channel;
        },
        onSuccess: (_data, { projectId }) => {
          queryClient.invalidateQueries({
            queryKey: ["projects", projectId],
          });
          queryClient.invalidateQueries({
            queryKey: ["projects", projectId, "channels", "app"],
          });
        },
      }),
  },

  // Request Log Channels
  request: {
    create: () =>
      useMutation({
        mutationFn: async ({
          projectId,
          ...data
        }: CreateRequestChannelRequest & { projectId: string }) => {
          const { data: channel, error } = await createRequestChannel(
            projectId,
            data,
            {
              baseURL: import.meta.env.VITE_API_URL!,
            }
          );
          if (error) return Promise.reject(error);
          return channel;
        },
        onSuccess: (_data, { projectId }) => {
          queryClient.invalidateQueries({
            queryKey: ["projects", projectId],
          });
          queryClient.invalidateQueries({
            queryKey: ["projects", projectId, "channels", "request"],
          });
        },
      }),
  },

  // Trace Channels
  trace: {
    create: () =>
      useMutation({
        mutationFn: async ({
          projectId,
          ...data
        }: CreateTraceChannelRequest & { projectId: string }) => {
          const { data: channel, error } = await createTraceChannel(
            projectId,
            data,
            {
              baseURL: import.meta.env.VITE_API_URL!,
            }
          );
          if (error) return Promise.reject(error);
          return channel;
        },
        onSuccess: (_data, { projectId }) => {
          queryClient.invalidateQueries({
            queryKey: ["projects", projectId],
          });
          queryClient.invalidateQueries({
            queryKey: ["projects", projectId, "channels", "trace"],
          });
        },
      }),
  },
};
