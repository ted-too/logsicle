import {
	listInvitations,
	validateInvitation,
} from "@/server/teams/invitations";
import { queryOptions } from "@tanstack/react-query";

// Query Keys
export const invitationsQueryKey = ["invitations"];
export const invitationQueryKey = (token: string) => ["invitation", token];

/**
 * Query options for listing all invitations for the current organization
 */
export const listInvitationsQueryOptions = () =>
	queryOptions({
		queryKey: invitationsQueryKey,
		queryFn: async () => {
			const { data, error } = await listInvitations();
			if (error) return Promise.reject(error);
			return data;
		},
		staleTime: 1000 * 60 * 5, // 5 minutes
	});

/**
 * Query options for validating and fetching a specific invitation by token
 */
export const validateInvitationQueryOptions = (token: string) =>
	queryOptions({
		queryKey: invitationQueryKey(token),
		queryFn: async () => {
			const { data, error } = await validateInvitation({ data: { token } });
			if (error) return Promise.reject(error);
			return data;
		},
	});
