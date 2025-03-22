import { z } from "zod";
import { createClient, type ErrorResponse, type Opts } from "..";

export interface User {
  id: string;
  created_at: string;
  updated_at: string;
  has_onboarded: boolean;
  deleted_at: any;
  email: string;
  name: string;
  last_login_at: string;
  projects: any;
  avatar_url: string | null;
}

export async function getUser({ $fetch, ...opts }: Opts) {
  const client = $fetch ?? createClient();

  return await client<User, ErrorResponse>("/v1/me", {
    credentials: "include",
    ...opts,
  });
}

export const updateUserSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  has_onboarded: z.boolean().optional(),
});

export type UpdateUserRequest = z.infer<typeof updateUserSchema>;

export async function updateUser(
  body: UpdateUserRequest,
  { $fetch, ...opts }: Opts
) {
  const client = $fetch ?? createClient();

  return await client<User, ErrorResponse>("/v1/me", {
    method: "PATCH",
    body,
    ...opts,
  });
}
