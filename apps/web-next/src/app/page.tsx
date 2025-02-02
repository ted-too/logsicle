import { Button } from "@/components/ui/button";
import { getUser } from "@/lib/auth.server";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function Home() {
  const user = await getUser()

  if (user) redirect("/dashboard");

  return (
    <div className="flex min-h-svh w-full flex-col items-center justify-center gap-10">
      <Image
        src="/logo.svg"
        width={200}
        height={72}
        className="object-contain"
        alt="logsicle"
      />
      <div className="flex items-center gap-4">
        <Button size="lg" asChild>
          <Link href={`/auth/sign-in`}>Sign In</Link>
        </Button>
      </div>
    </div>
  );
}
