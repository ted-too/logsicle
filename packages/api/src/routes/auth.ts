import { Opts } from "..";

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
}

export async function getUser({
  baseURL,
  ...opts
}: Opts): Promise<User | null> {
  try {
    const res = await fetch(`${baseURL}/api/v1/me`, opts);

    if (!res.ok) return null;

    const resJSON = await res.json();

    return resJSON;
  } catch (error) {
    return null;
  }
}
