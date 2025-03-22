import {
	getOrganization,
	listMembers,
	listUserOrganizations,
} from "@/server/organizations";
import type { BetterFetchError } from "@better-fetch/fetch";
import type { Organization, TeamMembership, UserOrganization } from "@repo/api";
import { queryOptions } from "@tanstack/react-query";

export const userOrganizationsQueryKey = ["user-organizations"];

export const organizationByIdQueryKey = (organizationId: string) => [
	"organizations",
	organizationId,
];

export const organizationMembersQueryKey = (organizationId: string) => [
	"organizations",
	organizationId,
	"members",
];

export const getUserOrganizationsQueryOptions = () =>
	queryOptions<UserOrganization[], BetterFetchError>({
		queryKey: userOrganizationsQueryKey,
		queryFn: async () => {
			const { data, error } = await listUserOrganizations();
			if (error) return Promise.reject(error);
			return data;
		},
	});

export const getOrganizationByIdQueryOptions = (organizationId: string) =>
	queryOptions<Organization, BetterFetchError>({
		queryKey: organizationByIdQueryKey(organizationId),
		queryFn: async () => {
			const { data, error } = await getOrganization({
				data: { id: organizationId },
			});
			if (error) return Promise.reject(error);
			return data;
		},
	});

export const getOrganizationMembersQueryOptions = (organizationId: string) =>
	queryOptions<TeamMembership[], BetterFetchError>({
		queryKey: organizationMembersQueryKey(organizationId),
		queryFn: async () => {
			const { data, error } = await listMembers({
				data: { id: organizationId },
			});
			if (error) return Promise.reject(error);
			return data;
		},
	});
