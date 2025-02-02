import Link from "next/link";

export function OnboardingFooter() {
  return (
    <div className="fixed bottom-0 w-full border-t border-border bg-background py-[18px]">
      <div className="mx-auto flex w-full max-w-[960px] items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          <Link href="/docs" className="hover:underline">Documentation</Link>
          <Link href="/support" className="hover:underline">Support</Link>
        </div>
        <span><Link href="https://2labs.io" target="_blank" className="hover:underline">2labs</Link>, © {new Date().getFullYear()}</span>
      </div>
    </div>
  );
}
