import { z } from "zod";
import { $fetch, type ErrorResponse, type FnResponse, type Opts } from "..";
import { betterFetch } from "@better-fetch/fetch";

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

export async function getUser({
  baseURL,
  ...opts
}: Opts): Promise<User | null> {
  try {
    const res = await fetch(`${baseURL}/v1/me`, {
      credentials: "include",
      ...opts,
    });

    if (!res.ok) return null;

    const resJSON = await res.json();

    return resJSON;
  } catch (error) {
    return null;
  }
}

export const updateUserSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  has_onboarded: z.boolean().optional(),
});

export type UpdateUserRequest = z.infer<typeof updateUserSchema>;

export async function updateUser(
  input: UpdateUserRequest,
  { baseURL, ...opts }: Opts
): Promise<FnResponse<User>> {
  const res = await fetch(`${baseURL}/v1/me`, {
    method: "PATCH",
    body: JSON.stringify(input),
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
        message: "Failed to update user",
        error: "Failed to parse JSON response",
      },
    };
  }

  if (!res.ok) {
    return { data: null, error: resJSON as ErrorResponse };
  }

  return { data: resJSON as User, error: null };
}
