import { OnboardingFooter } from "@/components/layout/onboarding-footer";
import { OnboardingHeader } from "@/components/layout/onboarding-header";
import { createFileRoute, notFound, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authd/$orgSlug/_onboarding")({
  // TODO: Make this a centralized layout component
  beforeLoad: async ({ context, params }) => {
    const { orgSlug } = params;
    const currentUserOrg = context.userOrgs?.find(
      (org) => org.organization.slug === orgSlug
    );

    if (!currentUserOrg) {
      throw notFound();
    }

    return {
      ...context,
      currentUserOrg,
    };
  },
  component: LayoutComponent,
});

function LayoutComponent() {
  return (
    <div className="relative flex h-svh w-full flex-col items-center">
      <OnboardingHeader />
      <div className="flex w-full max-w-[960px] flex-col">
        <Outlet />
      </div>
      <OnboardingFooter />
    </div>
  );
}
