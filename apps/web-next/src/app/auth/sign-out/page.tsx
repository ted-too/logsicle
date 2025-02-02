import { redirect } from "next/navigation";

export default function SignInPage() {
  redirect(`${import.meta.env.PUBLIC_API_URL}/api/v1/auth/sign-out`);
}
