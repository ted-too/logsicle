import { Button } from "@/components/ui/button";
import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: Index,
})

function Index() {
  return (
    <div className="flex min-h-svh w-full flex-col items-center justify-center gap-10">
      <img
        src="/logo.svg"
        width={200}
        height={72}
        className="object-contain"
        alt="logsicle"
      />
      <div className="flex items-center gap-4">
        <Button size="lg" asChild>
          <Link to="/auth/sign-in">Sign In</Link>
        </Button>
      </div>
    </div>
  )
}
