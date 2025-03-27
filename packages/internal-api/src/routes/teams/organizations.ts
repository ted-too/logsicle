import {
	type ErrorResponse,
	type Opts,
	createClient,
} from "@/index";
import type { OtherUser } from "@/routes/auth/basic";
import type { Project } from "@/routes/teams/projects";
import { z } from "zod";

export interface Organization {
	id: string;
	created_at: string;
	updated_at: string;
	deleted_at: string | null;
	name: string;
	slug: string;
	logo: string | null;
	description: string;
	created_by: OtherUser;
	projects: Project[];
	members: TeamMembership[];
}

export interface TeamMembership {
	id: string;
	created_at: string;
	updated_at: string;
	deleted_at: string | null;
	organization_id: string;
	user_id: string;
	role: "owner" | "admin" | "member";
	joined_at: string;
	invited_by: OtherUser | null;
	invited_by_id: string | null;
	user: OtherUser;
}

export interface TeamMembershipWithOrganization extends TeamMembership {
	organization: Organization;
}

export const createOrganizationSchema = z.object({
	name: z.string().min(1, "Name is required"),
	logo: z.string().nullish(),
	description: z.string().optional(),
});

export type CreateOrganizationRequest = z.infer<
	typeof createOrganizationSchema
>;

export async function createOrganization(
	body: CreateOrganizationRequest,
	{ $fetch, ...opts }: Opts,
) {
	const client = $fetch ?? createClient();

	return await client<Organization, ErrorResponse>(
		"/v1/organizations",
		{
			method: "POST",
			body: JSON.stringify(body),
			credentials: "include",
			...opts,
		},
	);
}

export async function deleteOrganization(
	organizationId: string,
	{ $fetch, ...opts }: Opts,
) {
	const client = $fetch ?? createClient();

	return await client<void, ErrorResponse>(
		`/v1/organizations/${organizationId}`,
		{
			method: "DELETE",
			credentials: "include",
			...opts,
		},
	);
}

export async function listOrganizationMembers({ $fetch, ...opts }: Opts) {
	const client = $fetch ?? createClient();

	return await client<TeamMembership[], ErrorResponse>(
		"/v1/organizations/members",
		{
			credentials: "include",
			...opts,
		},
	);
}

export async function listUserOrganizationMemberships({ $fetch, ...opts }: Opts) {
	const client = $fetch ?? createClient();

	return await client<TeamMembershipWithOrganization[], ErrorResponse>(
		"/v1/organizations",
		{
			credentials: "include",
			...opts,
		},
	);
}
