import { OnboardingFooter } from '@/components/layout/onboarding-footer'
import { OnboardingHeader } from '@/components/layout/onboarding-header'
import { MainOnboardingForm } from '@/components/onboarding'
import { userQueries } from '@/qc/queries/auth'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authd/dashboard/onboarding')({
  component: RouteComponent,
})

function RouteComponent() {
  const { data } = userQueries.getUser.useSuspenseQuery()
  return (
    <div className="relative flex h-svh w-full flex-col items-center">
      <OnboardingHeader user={data} />
      <div className="flex w-full max-w-[960px] flex-col">
        <MainOnboardingForm />
      </div>
      <OnboardingFooter />
    </div>
  )
}
