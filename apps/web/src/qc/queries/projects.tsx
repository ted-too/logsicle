/* eslint-disable react-hooks/rules-of-hooks */
import {
  createAPIKey,
  CreateAPIKeyRequest,
  createProject,
  CreateProjectRequest,
  deleteAPIKey,
  getProject,
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
  listQueryOptions: (opts?: { organizationId?: string, requestInit?: RequestInit }) =>
    queryOptions({
      queryKey: ["projects", opts?.organizationId ?? "all"],
      queryFn: async () => {
        const { data, error } = await listProjects({
          baseURL: import.meta.env.VITE_API_URL!,
          organizationId: opts?.organizationId,
          ...opts?.requestInit,
        });
        if (error) return Promise.reject(error);
        return data;
      },
    }),
  list: {
    useQuery: (opts?: { organizationId?: string, requestInit?: RequestInit }) => 
      useQuery(projectsQueries.listQueryOptions(opts)),
    useSuspenseQuery: (opts?: { organizationId?: string, requestInit?: RequestInit }) =>
      useSuspenseQuery(projectsQueries.listQueryOptions(opts)),
  },
  getByIdQueryOptions: (
    projectId: string,
    opts?: RequestInit
  ) =>
    queryOptions({
      queryKey: ["projects", "detail", projectId],
      queryFn: async () => {
        if (!projectId) return null;
        const { data, error } = await getProject(projectId, {
          baseURL: import.meta.env.VITE_API_URL!,
          ...opts,
        });
        if (error) return Promise.reject(error);
        return data;
      },
    }),
  getById: {
    useQuery: (projectId: string) =>
      useQuery(projectsQueries.getByIdQueryOptions(projectId)),
    useSuspenseQuery: (projectId: string) =>
      useSuspenseQuery(projectsQueries.getByIdQueryOptions(projectId)),
  },
  create: () =>
    useMutation({
      mutationFn: async (input: CreateProjectRequest) => {
        const { data, error } = await createProject(input, {
          baseURL: import.meta.env.VITE_API_URL!,
        });
        if (error) return Promise.reject(error);
        return data;
      },
      onSuccess: (data) => {
        // Invalidate both the "all" projects list and the organization-specific list
        queryClient.invalidateQueries({
          queryKey: ["projects", "all"],
        });
        if (data.organization_id) {
          queryClient.invalidateQueries({
            queryKey: ["projects", data.organization_id],
          });
        }
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
          baseURL: import.meta.env.VITE_API_URL!,
        });
        if (error) return Promise.reject(error);
        return data;
      },
      onSuccess: (data) => {
        // Invalidate both the "all" projects list and the organization-specific list
        queryClient.invalidateQueries({
          queryKey: ["projects", "all"],
        });
        if (data.organization_id) {
          queryClient.invalidateQueries({
            queryKey: ["projects", data.organization_id],
          });
        }
        queryClient.invalidateQueries({
          queryKey: ["projects", "detail", data.id],
        });
      },
    }),
};

export const apiKeysQueries = {
  listQueryOptions: (projectId: string, opts?: RequestInit) =>
    queryOptions({
      queryKey: ["projects", "detail", projectId, "api-keys"],
      queryFn: async () => {
        if (projectId === "") return [];
        const { data, error } = await listAPIKeys(projectId, {
          baseURL: import.meta.env.VITE_API_URL!,
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
          baseURL: import.meta.env.VITE_API_URL!,
        });
        if (error) return Promise.reject(error);
        return data;
      },
      onSuccess: (_data, { projectId }) => {
        queryClient.invalidateQueries({
          queryKey: ["projects", "detail", projectId, "api-keys"],
        });
        queryClient.invalidateQueries({
          queryKey: ["projects", "detail", projectId],
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
          baseURL: import.meta.env.VITE_API_URL!,
        });
        if (error) return Promise.reject(error);
        return null;
      },
      onSuccess: (_data, { projectId }) => {
        queryClient.invalidateQueries({
          queryKey: ["projects", "detail", projectId, "api-keys"],
        });
        queryClient.invalidateQueries({
          queryKey: ["projects", "detail", projectId],
        });
      },
    }),
};
