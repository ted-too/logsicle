/* eslint-disable react-hooks/rules-of-hooks */
import {
  type UpdateEventChannelRequest,
  type UpdateAppLogChannelRequest,
  type UpdateRequestChannelRequest,
  type UpdateTraceChannelRequest,
  updateEventChannel,
  updateAppLogChannel,
  updateRequestChannel,
  updateTraceChannel,
  deleteEventChannel,
  deleteAppLogChannel,
  deleteRequestChannel,
  deleteTraceChannel,
} from "@repo/api";
import { useMutation } from "@tanstack/react-query";
import { getQueryClient } from "../query-client";

const queryClient = getQueryClient();

export const updateChannelsMutations = {
  // Event Channels
  event: {
    update: () =>
      useMutation({
        mutationFn: async ({
          projectId,
          channelId,
          ...data
        }: UpdateEventChannelRequest & {
          projectId: string;
          channelId: string;
        }) => {
          const { data: channel, error } = await updateEventChannel(
            projectId,
            channelId,
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
    delete: () =>
      useMutation({
        mutationFn: async ({
          projectId,
          channelId,
        }: {
          projectId: string;
          channelId: string;
        }) => {
          const { error } = await deleteEventChannel(projectId, channelId, {
            baseURL: import.meta.env.VITE_API_URL!,
          });
          if (error) return Promise.reject(error);
        },
        onSuccess: (_data, { projectId }) => {
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
    update: () =>
      useMutation({
        mutationFn: async ({
          projectId,
          channelId,
          ...data
        }: UpdateAppLogChannelRequest & {
          projectId: string;
          channelId: string;
        }) => {
          const { data: channel, error } = await updateAppLogChannel(
            projectId,
            channelId,
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
    delete: () =>
      useMutation({
        mutationFn: async ({
          projectId,
          channelId,
        }: {
          projectId: string;
          channelId: string;
        }) => {
          const { error } = await deleteAppLogChannel(projectId, channelId, {
            baseURL: import.meta.env.VITE_API_URL!,
          });
          if (error) return Promise.reject(error);
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
    update: () =>
      useMutation({
        mutationFn: async ({
          projectId,
          channelId,
          ...data
        }: UpdateRequestChannelRequest & {
          projectId: string;
          channelId: string;
        }) => {
          const { data: channel, error } = await updateRequestChannel(
            projectId,
            channelId,
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
    delete: () =>
      useMutation({
        mutationFn: async ({
          projectId,
          channelId,
        }: {
          projectId: string;
          channelId: string;
        }) => {
          const { error } = await deleteRequestChannel(projectId, channelId, {
            baseURL: import.meta.env.VITE_API_URL!,
          });
          if (error) return Promise.reject(error);
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
    update: () =>
      useMutation({
        mutationFn: async ({
          projectId,
          channelId,
          ...data
        }: UpdateTraceChannelRequest & {
          projectId: string;
          channelId: string;
        }) => {
          const { data: channel, error } = await updateTraceChannel(
            projectId,
            channelId,
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
    delete: () =>
      useMutation({
        mutationFn: async ({
          projectId,
          channelId,
        }: {
          projectId: string;
          channelId: string;
        }) => {
          const { error } = await deleteTraceChannel(projectId, channelId, {
            baseURL: import.meta.env.VITE_API_URL!,
          });
          if (error) return Promise.reject(error);
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
