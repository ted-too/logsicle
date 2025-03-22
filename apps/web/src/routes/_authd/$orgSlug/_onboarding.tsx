import { OnboardingFooter } from "@/components/layout/onboarding-footer";
import { OnboardingHeader } from "@/components/layout/onboarding-header";
import { createFileRoute, notFound, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authd/$orgSlug/_onboarding")({
  beforeLoad: async ({ context, params }) => {
    const { orgSlug } = params;

    if (orgSlug === "initial-setup") {
      const currentUserOrg = context.userOrgs?.[0].organization;

      if (!currentUserOrg) {
        throw notFound();
      }

      throw redirect({
        to: "/$orgSlug/onboarding",
        params: {
          orgSlug: currentUserOrg.slug,
        },
      });
    }

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
