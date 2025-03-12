/* eslint-disable react-hooks/rules-of-hooks */
import {
  addOrganizationMember,
  AddMemberRequest,
  createOrganization,
  CreateOrganizationRequest,
  deleteOrganization,
  getOrganization,
  listOrganizationMembers,
  listOrganizations,
  removeOrganizationMember,
  updateOrganization,
  UpdateOrganizationRequest,
  updateOrganizationMember,
  UpdateMemberRoleRequest,
} from "@repo/api";
import {
  queryOptions,
  useMutation,
  useQuery,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { getQueryClient } from "../query-client";

const queryClient = getQueryClient();

export const organizationsQueries = {
  listQueryOptions: (opts?: RequestInit) =>
    queryOptions({
      queryKey: ["organizations"],
      queryFn: async () => {
        const { data, error } = await listOrganizations({
          baseURL: import.meta.env.PUBLIC_API_URL!,
          ...opts,
        });
        if (error) return Promise.reject(error);
        return data;
      },
    }),
  list: {
    useQuery: () => useQuery(organizationsQueries.listQueryOptions()),
    useSuspenseQuery: () =>
      useSuspenseQuery(organizationsQueries.listQueryOptions()),
  },
  getByIdQueryOptions: (
    organizationId: string,
    opts?: RequestInit
  ) =>
    queryOptions({
      queryKey: ["organizations", organizationId],
      queryFn: async () => {
        if (!organizationId) return null;
        const { data, error } = await getOrganization(organizationId, {
          baseURL: import.meta.env.PUBLIC_API_URL!,
          ...opts,
        });
        if (error) return Promise.reject(error);
        return data;
      },
    }),
  getById: {
    useQuery: (organizationId: string) =>
      useQuery(organizationsQueries.getByIdQueryOptions(organizationId)),
    useSuspenseQuery: (organizationId: string) =>
      useSuspenseQuery(organizationsQueries.getByIdQueryOptions(organizationId)),
  },
  create: () =>
    useMutation({
      mutationFn: async (input: CreateOrganizationRequest) => {
        const { data, error } = await createOrganization(input, {
          baseURL: import.meta.env.PUBLIC_API_URL!,
        });
        if (error) return Promise.reject(error);
        return data;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: organizationsQueries.listQueryOptions().queryKey,
        });
      },
    }),
  update: () =>
    useMutation({
      mutationFn: async ({
        organizationId,
        input,
      }: {
        organizationId: string;
        input: UpdateOrganizationRequest;
      }) => {
        const { data, error } = await updateOrganization(organizationId, input, {
          baseURL: import.meta.env.PUBLIC_API_URL!,
        });
        if (error) return Promise.reject(error);
        return data;
      },
      onSuccess: (_data, { organizationId }) => {
        queryClient.invalidateQueries({
          queryKey: organizationsQueries.listQueryOptions().queryKey,
        });
        queryClient.invalidateQueries({
          queryKey: organizationsQueries.getByIdQueryOptions(organizationId).queryKey,
        });
      },
    }),
  delete: () =>
    useMutation({
      mutationFn: async (organizationId: string) => {
        const { error } = await deleteOrganization(organizationId, {
          baseURL: import.meta.env.PUBLIC_API_URL!,
        });
        if (error) return Promise.reject(error);
        return null;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: organizationsQueries.listQueryOptions().queryKey,
        });
      },
    }),
};

export const membersQueries = {
  listQueryOptions: (organizationId: string, opts?: RequestInit) =>
    queryOptions({
      queryKey: ["organizations", organizationId, "members"],
      queryFn: async () => {
        if (!organizationId) return [];
        const { data, error } = await listOrganizationMembers(organizationId, {
          baseURL: import.meta.env.PUBLIC_API_URL!,
          ...opts,
        });
        if (error) return Promise.reject(error);
        return data;
      },
    }),
  list: {
    useQuery: (organizationId: string) =>
      useQuery(membersQueries.listQueryOptions(organizationId)),
    useSuspenseQuery: (organizationId: string) =>
      useSuspenseQuery(membersQueries.listQueryOptions(organizationId)),
  },
  add: () =>
    useMutation({
      mutationFn: async ({
        organizationId,
        input,
      }: {
        organizationId: string;
        input: AddMemberRequest;
      }) => {
        const { data, error } = await addOrganizationMember(organizationId, input, {
          baseURL: import.meta.env.PUBLIC_API_URL!,
        });
        if (error) return Promise.reject(error);
        return data;
      },
      onSuccess: (_data, { organizationId }) => {
        queryClient.invalidateQueries({
          queryKey: membersQueries.listQueryOptions(organizationId).queryKey,
        });
        queryClient.invalidateQueries({
          queryKey: organizationsQueries.getByIdQueryOptions(organizationId).queryKey,
        });
      },
    }),
  updateRole: () =>
    useMutation({
      mutationFn: async ({
        organizationId,
        memberId,
        input,
      }: {
        organizationId: string;
        memberId: string;
        input: UpdateMemberRoleRequest;
      }) => {
        const { data, error } = await updateOrganizationMember(
          organizationId,
          memberId,
          input,
          {
            baseURL: import.meta.env.PUBLIC_API_URL!,
          }
        );
        if (error) return Promise.reject(error);
        return data;
      },
      onSuccess: (_data, { organizationId }) => {
        queryClient.invalidateQueries({
          queryKey: membersQueries.listQueryOptions(organizationId).queryKey,
        });
      },
    }),
  remove: () =>
    useMutation({
      mutationFn: async ({
        organizationId,
        memberId,
      }: {
        organizationId: string;
        memberId: string;
      }) => {
        const { error } = await removeOrganizationMember(organizationId, memberId, {
          baseURL: import.meta.env.PUBLIC_API_URL!,
        });
        if (error) return Promise.reject(error);
        return null;
      },
      onSuccess: (_data, { organizationId }) => {
        queryClient.invalidateQueries({
          queryKey: membersQueries.listQueryOptions(organizationId).queryKey,
        });
        queryClient.invalidateQueries({
          queryKey: organizationsQueries.getByIdQueryOptions(organizationId).queryKey,
        });
      },
    }),
}; 