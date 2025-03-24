import {
	listUserOrganizationMemberships,
	listOrganizationMembers,
} from "@/server/teams/organizations";
import { queryOptions } from "@tanstack/react-query";

export const userOrganizationsQueryKey = ["user-organizations"];

export const organizationMembersQueryKey = (organizationId: string) => [
	"organizations",
	organizationId,
	"members",
];

export const listUserOrganizationMembershipsQueryOptions = () =>
	queryOptions({
		queryKey: userOrganizationsQueryKey,
		queryFn: async () => {
			const { data, error } = await listUserOrganizationMemberships();
			if (error) return Promise.reject(error);
			return data;
		},
	});

export const listOrganizationMembersQueryOptions = (organizationId: string) =>
	queryOptions({
		queryKey: organizationMembersQueryKey(organizationId),
		queryFn: async () => {
			const { data, error } = await listOrganizationMembers();
			if (error) return Promise.reject(error);
			return data;
		},
	});
