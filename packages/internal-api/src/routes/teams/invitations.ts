import { type ErrorResponse, type Opts, createClient } from "@/index";
import type { OtherUser } from "@/routes/auth/basic";
import type { Organization } from "@/routes/teams/organizations";
import { z } from "zod";

export type InvitationStatus = "pending" | "accepted" | "rejected" | "expired";

export interface Invitation {
	id: string;
	created_at: string;
	updated_at: string;
	deleted_at: string | null;
	email: string;
	organization_id: string;
	token: string;
	organization: Organization;
	role: "owner" | "admin" | "member";
	expires_at: string;
	status: InvitationStatus;
	invited_by_id: string;
	invited_by: OtherUser;
}

export const createInvitationSchema = z.object({
	email: z.string().email("Please enter a valid email address"),
	role: z.enum(["admin", "member"], {
		errorMap: () => ({ message: "Invalid role" }),
	}),
});

export type CreateInvitationRequest = z.infer<typeof createInvitationSchema>;

export interface CreateInvitationResponse extends Invitation {
	invite_link?: string; // TODO: Potential future feature
}

export async function createInvitation(
	body: CreateInvitationRequest,
	{ $fetch, ...opts }: Opts,
) {
	const client = $fetch ?? createClient();

	return await client<CreateInvitationResponse, ErrorResponse>(
		"/v1/invitations",
		{
			method: "POST",
			body: JSON.stringify(body),
			credentials: "include",
			...opts,
		},
	);
}

export async function listInvitations({ $fetch, ...opts }: Opts) {
	const client = $fetch ?? createClient();

	return await client<Invitation[], ErrorResponse>("/v1/invitations", {
		credentials: "include",
		...opts,
	});
}

export async function cancelInvitation(
	invitationId: string,
	{ $fetch, ...opts }: Opts,
) {
	const client = $fetch ?? createClient();

	return await client<void, ErrorResponse>(`/v1/invitations/${invitationId}`, {
		method: "DELETE",
		credentials: "include",
		...opts,
	});
}

export async function resendInvitation(
	invitationId: string,
	{ $fetch, ...opts }: Opts,
) {
	const client = $fetch ?? createClient();

	return await client<Invitation, ErrorResponse>(
		`/v1/invitations/${invitationId}/resend`,
		{
			method: "POST",
			credentials: "include",
			...opts,
		},
	);
}

export async function validateInvitation(
	token: string,
	{ $fetch, ...opts }: Opts,
) {
	const client = $fetch ?? createClient();

	return await client<Invitation, ErrorResponse>(
		`/v1/auth/invitations/${token}`,
		{
			credentials: "include",
			...opts,
		},
	);
}

export const acceptInvitationSchema = z.object({
	token: z.string().min(1, "Token is required"),
});

export type AcceptInvitationRequest = z.infer<typeof acceptInvitationSchema>;

export async function acceptInvitation(
	body: AcceptInvitationRequest,
	{ $fetch, ...opts }: Opts,
) {
	const client = $fetch ?? createClient();

	return await client<
		{ message: string; organization: Organization },
		ErrorResponse
	>("/v1/invitations/accept", {
		method: "POST",
		body: JSON.stringify(body),
		credentials: "include",
		...opts,
	});
}

export const acceptInvitationWithRegistrationSchema = z.object({
	token: z.string().min(1, "Token is required"),
	name: z.string().min(1, "Name is required"),
	password: z.string().min(8, "Password must be at least 8 characters"),
});

export type AcceptInvitationWithRegistrationRequest = z.infer<
	typeof acceptInvitationWithRegistrationSchema
>;

export async function acceptInvitationWithRegistration(
	body: AcceptInvitationWithRegistrationRequest,
	{ $fetch, ...opts }: Opts,
) {
	const client = $fetch ?? createClient();

	return await client<{ user: OtherUser; session: any }, ErrorResponse>(
		"/v1/auth/invitations/accept-with-registration",
		{
			method: "POST",
			body: JSON.stringify(body),
			credentials: "include",
			...opts,
		},
	);
}
