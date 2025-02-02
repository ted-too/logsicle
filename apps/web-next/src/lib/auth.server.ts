import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getUser as apiGetUser } from "@repo/api";
import { headers } from "next/headers";

export const getUser = cache(async () => {
  console.log("getUser");
  const user =  await apiGetUser({ baseURL: process.env.NEXT_PUBLIC_API_URL!, headers: await headers() });
  return user;
});

export async function ensureAuthenticated() {
  const user = await getUser();
  if (!user) {
    throw redirect("/");
  }

  return user;
}
