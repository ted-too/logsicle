import type { ErrorResponse, Opts } from "@/types";
import { z } from "zod";
import { createClient } from "..";
import { Project } from "./projects";

// Schemas
export const createOrganizationSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});

export type CreateOrganizationRequest = z.infer<
  typeof createOrganizationSchema
>;

export const updateOrganizationSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  description: z.string().optional(),
});

export type UpdateOrganizationRequest = z.infer<
  typeof updateOrganizationSchema
>;

export const addMemberSchema = z.object({
  user_id: z.string().min(1, "User ID is required"),
  role: z.enum(["owner", "admin", "member"] as const),
});

export type AddMemberRequest = z.infer<typeof addMemberSchema>;

export const updateMemberRoleSchema = z.object({
  role: z.enum(["owner", "admin", "member"] as const),
});

export type UpdateMemberRoleRequest = z.infer<typeof updateMemberRoleSchema>;

// Organization role type
export type Role = "owner" | "admin" | "member";

// Organization interface
export interface Organization {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  slug: string;
  description: string;
  created_by: string;
  members: TeamMembership[];
  projects: Project[];
}

// Team membership interface
export interface TeamMembership {
  id: string;
  created_at: string;
  updated_at: string;
  organization_id: string;
  user_id: string;
  role: Role;
  joined_at: string;
  invited_by: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatar_url?: string;
  };
  organization: Organization;
}

export type UserOrganization = Omit<TeamMembership, "user">;

// API Functions

// Create a new organization
export async function createOrganization(
  data: CreateOrganizationRequest,
  { $fetch, ...opts }: Opts
) {
  const client = $fetch ?? createClient();

  return await client<Organization, ErrorResponse>("/v1/organizations", {
    method: "POST",
    body: data,
    credentials: "include",
    ...opts,
  });
}

// List all organizations the user is a member of
export async function listUserOrganizations({ $fetch, ...opts }: Opts) {
  const client = $fetch ?? createClient();

  return await client<UserOrganization[], ErrorResponse>("/v1/organizations", {
    credentials: "include",
    ...opts,
  });
}

// Get a single organization by ID
export async function getOrganization(
  organizationId: string,
  { $fetch, ...opts }: Opts
) {
  const client = $fetch ?? createClient();

  return await client<Organization, ErrorResponse>(
    `/v1/organizations/${organizationId}`,
    {
      credentials: "include",
      ...opts,
    }
  );
}

// Update an organization
export async function updateOrganization(
  organizationId: string,
  data: UpdateOrganizationRequest,
  { $fetch, ...opts }: Opts
) {
  const client = $fetch ?? createClient();

  return await client<Organization, ErrorResponse>(
    `/v1/organizations/${organizationId}`,
    {
      method: "PATCH",
      body: data,
      credentials: "include",
      ...opts,
    }
  );
}

// Delete an organization
export async function deleteOrganization(
  organizationId: string,
  { $fetch, ...opts }: Opts
) {
  const client = $fetch ?? createClient();

  return await client<null, ErrorResponse>(
    `/v1/organizations/${organizationId}`,
    {
      method: "DELETE",
      credentials: "include",
      ...opts,
    }
  );
}

// List all members of an organization
export async function listOrganizationMembers(
  organizationId: string,
  { $fetch, ...opts }: Opts
) {
  const client = $fetch ?? createClient();

  return await client<TeamMembership[], ErrorResponse>(
    `/v1/organizations/${organizationId}/members`,
    {
      credentials: "include",
      ...opts,
    }
  );
}

// Add a new member to an organization
export async function addOrganizationMember(
  organizationId: string,
  data: AddMemberRequest,
  { $fetch, ...opts }: Opts
) {
  const client = $fetch ?? createClient();

  return await client<TeamMembership, ErrorResponse>(
    `/v1/organizations/${organizationId}/members`,
    {
      method: "POST",
      body: data,
      credentials: "include",
      ...opts,
    }
  );
}

// Update a member's role in an organization
export async function updateOrganizationMember(
  organizationId: string,
  memberId: string,
  data: UpdateMemberRoleRequest,
  { $fetch, ...opts }: Opts
) {
  const client = $fetch ?? createClient();

  return await client<TeamMembership, ErrorResponse>(
    `/v1/organizations/${organizationId}/members/${memberId}`,
    {
      method: "PATCH",
      body: data,
      credentials: "include",
      ...opts,
    }
  );
}

// Remove a member from an organization
export async function removeOrganizationMember(
  organizationId: string,
  memberId: string,
  { $fetch, ...opts }: Opts
) {
  const client = $fetch ?? createClient();

  return await client<null, ErrorResponse>(
    `/v1/organizations/${organizationId}/members/${memberId}`,
    {
      method: "DELETE",
      credentials: "include",
      ...opts,
    }
  );
}
