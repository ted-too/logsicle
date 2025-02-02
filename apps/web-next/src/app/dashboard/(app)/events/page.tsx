import { ensureAuthenticated } from "@/lib/auth.server";

export default async function DashboardEvents() {
  const user = await ensureAuthenticated();
  
  return <div>Hello {user.email}</div>;
}
