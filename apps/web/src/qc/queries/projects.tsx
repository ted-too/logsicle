/* eslint-disable react-hooks/rules-of-hooks */
import {
  createAPIKey,
  CreateAPIKeyRequest,
  createProject,
  CreateProjectRequest,
  deleteAPIKey,
  listAPIKeys,
  listProjects,
  updateProject,
} from "@repo/api";
import {
  queryOptions,
  useMutation,
  useQuery,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { getQueryClient } from "../query-client";

const queryClient = getQueryClient();

export const projectsQueries = {
  listQueryOptions: (opts?: RequestInit) =>
    queryOptions({
      queryKey: ["projects"],
      queryFn: async () => {
        const { data, error } = await listProjects({
          baseURL: import.meta.env.PUBLIC_API_URL!,
          ...opts,
        });
        if (error) return Promise.reject(error);
        return data;
      },
    }),
  list: {
    useQuery: () => useQuery(projectsQueries.listQueryOptions()),
    useSuspenseQuery: () =>
      useSuspenseQuery(projectsQueries.listQueryOptions()),
  },
  create: () =>
    useMutation({
      mutationFn: async (input: CreateProjectRequest) => {
        const { data, error } = await createProject(input, {
          baseURL: import.meta.env.PUBLIC_API_URL!,
        });
        if (error) return Promise.reject(error);
        return data;
      },
    }),
  update: () =>
    useMutation({
      mutationFn: async ({
        projectId,
        input,
      }: {
        projectId: string;
        input: Partial<CreateProjectRequest>;
      }) => {
        const { data, error } = await updateProject(projectId, input, {
          baseURL: import.meta.env.PUBLIC_API_URL!,
        });
        if (error) return Promise.reject(error);
        return data;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: projectsQueries.listQueryOptions().queryKey,
        });
      },
    }),
};

export const apiKeysQueries = {
  listQueryOptions: (projectId: string, opts?: RequestInit) =>
    queryOptions({
      queryKey: ["projects", projectId, "api-keys"],
      queryFn: async () => {
        if (projectId === "") return [];
        const { data, error } = await listAPIKeys(projectId, {
          baseURL: import.meta.env.PUBLIC_API_URL!,
          ...opts,
        });
        if (error) return Promise.reject(error);
        return data;
      },
    }),
  list: {
    useQuery: (projectId: string) =>
      useQuery(apiKeysQueries.listQueryOptions(projectId)),
    useSuspenseQuery: (projectId: string) =>
      useSuspenseQuery(apiKeysQueries.listQueryOptions(projectId)),
  },
  create: () =>
    useMutation({
      mutationFn: async ({
        projectId,
        input,
      }: {
        projectId: string;
        input: CreateAPIKeyRequest;
      }) => {
        const { data, error } = await createAPIKey(projectId, input, {
          baseURL: import.meta.env.PUBLIC_API_URL!,
        });
        if (error) return Promise.reject(error);
        return data;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: projectsQueries.listQueryOptions().queryKey,
        });
      },
    }),
  delete: () =>
    useMutation({
      mutationFn: async ({
        projectId,
        keyId,
      }: {
        projectId: string;
        keyId: string;
      }) => {
        const { error } = await deleteAPIKey(projectId, keyId, {
          baseURL: import.meta.env.PUBLIC_API_URL!,
        });
        if (error) return Promise.reject(error);
        return null;
      },
      onSuccess: (_data, { projectId }) => {
        queryClient.invalidateQueries({
          queryKey: apiKeysQueries.listQueryOptions(projectId).queryKey,
        });
      },
    }),
};
