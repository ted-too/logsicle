import { OnboardingFooter } from "@/components/layout/onboarding-footer";
import { OnboardingHeader } from "@/components/layout/onboarding-header";
import { MainOnboardingForm } from "@/components/onboarding";
import { ensureAuthenticated } from "@/lib/auth.server";
import { projectsQueries } from "@/qc/queries/projects";
import { getQueryClient } from "@/qc/query-client";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { headers } from "next/headers";

export default async function OnboardingPage() {
  const user = await ensureAuthenticated();

  const queryClient = getQueryClient();

  await queryClient.prefetchQuery(
    projectsQueries.listQueryOptions({ headers: await headers() })
  );

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="relative flex h-svh w-full flex-col items-center">
        <OnboardingHeader user={user} />
        <div className="flex w-full max-w-[960px] flex-col">
          <MainOnboardingForm />
        </div>
        <OnboardingFooter />
      </div>
    </HydrationBoundary>
  );
}
