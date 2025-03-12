import type { ErrorResponse, FnResponse, Opts } from "@/types";
import { z } from "zod";
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
  projects: Pick<Project, "id" | "name" | "slug">[];
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
  { baseURL, ...opts }: Opts
): Promise<FnResponse<Organization>> {
  const res = await fetch(`${baseURL}/v1/organizations`, {
    method: "POST",
    body: JSON.stringify(data),
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    ...opts,
  });

  let resJSON: unknown | undefined = undefined;
  try {
    resJSON = await res.json();
  } catch (error) {
    return {
      data: null,
      error: {
        message: "Failed to create organization",
        error: "Failed to parse JSON response",
      },
    };
  }

  if (!res.ok) {
    return { data: null, error: resJSON as ErrorResponse };
  }

  return { data: resJSON as Organization, error: null };
}

// List all organizations the user is a member of
export async function listUserOrganizations({
  baseURL,
  ...opts
}: Opts): Promise<FnResponse<UserOrganization[]>> {
  const res = await fetch(`${baseURL}/v1/organizations`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    ...opts,
  });

  let resJSON: unknown | undefined = undefined;
  try {
    resJSON = await res.json();
  } catch (error) {
    return {
      data: null,
      error: {
        message: "Failed to list organizations",
        error: "Failed to parse JSON response",
      },
    };
  }

  if (!res.ok) {
    return { data: null, error: resJSON as ErrorResponse };
  }

  return { data: resJSON as UserOrganization[], error: null };
}

// Get a single organization by ID
export async function getOrganization(
  organizationId: string,
  { baseURL, ...opts }: Opts
): Promise<FnResponse<Organization>> {
  const res = await fetch(`${baseURL}/v1/organizations/${organizationId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    ...opts,
  });

  let resJSON: unknown | undefined = undefined;
  try {
    resJSON = await res.json();
  } catch (error) {
    return {
      data: null,
      error: {
        message: "Failed to get organization",
        error: "Failed to parse JSON response",
      },
    };
  }

  if (!res.ok) {
    return { data: null, error: resJSON as ErrorResponse };
  }

  return { data: resJSON as Organization, error: null };
}

// Update an organization
export async function updateOrganization(
  organizationId: string,
  data: UpdateOrganizationRequest,
  { baseURL, ...opts }: Opts
): Promise<FnResponse<Organization>> {
  const res = await fetch(`${baseURL}/v1/organizations/${organizationId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    ...opts,
  });

  let resJSON: unknown | undefined = undefined;
  try {
    resJSON = await res.json();
  } catch (error) {
    return {
      data: null,
      error: {
        message: "Failed to update organization",
        error: "Failed to parse JSON response",
      },
    };
  }

  if (!res.ok) {
    return { data: null, error: resJSON as ErrorResponse };
  }

  return { data: resJSON as Organization, error: null };
}

// Delete an organization
export async function deleteOrganization(
  organizationId: string,
  { baseURL, ...opts }: Opts
): Promise<FnResponse<null>> {
  const res = await fetch(`${baseURL}/v1/organizations/${organizationId}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    ...opts,
  });

  if (!res.ok) {
    let resJSON: unknown | undefined = undefined;
    try {
      resJSON = await res.json();
    } catch (error) {
      return {
        data: null,
        error: {
          message: "Failed to delete organization",
          error: "Failed to parse JSON response",
        },
      };
    }
    return { data: null, error: resJSON as ErrorResponse };
  }

  return { data: null, error: null };
}

// List all members of an organization
export async function listOrganizationMembers(
  organizationId: string,
  { baseURL, ...opts }: Opts
): Promise<FnResponse<TeamMembership[]>> {
  const res = await fetch(
    `${baseURL}/v1/organizations/${organizationId}/members`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      ...opts,
    }
  );

  let resJSON: unknown | undefined = undefined;
  try {
    resJSON = await res.json();
  } catch (error) {
    return {
      data: null,
      error: {
        message: "Failed to list organization members",
        error: "Failed to parse JSON response",
      },
    };
  }

  if (!res.ok) {
    return { data: null, error: resJSON as ErrorResponse };
  }

  return { data: resJSON as TeamMembership[], error: null };
}

// Add a new member to an organization
export async function addOrganizationMember(
  organizationId: string,
  data: AddMemberRequest,
  { baseURL, ...opts }: Opts
): Promise<FnResponse<TeamMembership>> {
  const res = await fetch(
    `${baseURL}/v1/organizations/${organizationId}/members`,
    {
      method: "POST",
      body: JSON.stringify(data),
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      ...opts,
    }
  );

  let resJSON: unknown | undefined = undefined;
  try {
    resJSON = await res.json();
  } catch (error) {
    return {
      data: null,
      error: {
        message: "Failed to add member to organization",
        error: "Failed to parse JSON response",
      },
    };
  }

  if (!res.ok) {
    return { data: null, error: resJSON as ErrorResponse };
  }

  return { data: resJSON as TeamMembership, error: null };
}

// Update a member's role in an organization
export async function updateOrganizationMember(
  organizationId: string,
  memberId: string,
  data: UpdateMemberRoleRequest,
  { baseURL, ...opts }: Opts
): Promise<FnResponse<TeamMembership>> {
  const res = await fetch(
    `${baseURL}/v1/organizations/${organizationId}/members/${memberId}`,
    {
      method: "PATCH",
      body: JSON.stringify(data),
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      ...opts,
    }
  );

  let resJSON: unknown | undefined = undefined;
  try {
    resJSON = await res.json();
  } catch (error) {
    return {
      data: null,
      error: {
        message: "Failed to update member role",
        error: "Failed to parse JSON response",
      },
    };
  }

  if (!res.ok) {
    return { data: null, error: resJSON as ErrorResponse };
  }

  return { data: resJSON as TeamMembership, error: null };
}

// Remove a member from an organization
export async function removeOrganizationMember(
  organizationId: string,
  memberId: string,
  { baseURL, ...opts }: Opts
): Promise<FnResponse<null>> {
  const res = await fetch(
    `${baseURL}/v1/organizations/${organizationId}/members/${memberId}`,
    {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      ...opts,
    }
  );

  if (!res.ok) {
    let resJSON: unknown | undefined = undefined;
    try {
      resJSON = await res.json();
    } catch (error) {
      return {
        data: null,
        error: {
          message: "Failed to remove member from organization",
          error: "Failed to parse JSON response",
        },
      };
    }
    return { data: null, error: resJSON as ErrorResponse };
  }

  return { data: null, error: null };
}
