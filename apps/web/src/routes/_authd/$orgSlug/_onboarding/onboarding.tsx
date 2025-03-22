// import { GenAPIKey } from "@/components/onboarding/gen-api-key";
import { SetupProject } from "@/components/onboarding/setup-project";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { ZapIcon } from "lucide-react";
import { useState } from "react";
// import { TestAPIKey } from "@/components/onboarding/test-api-key";
import { createFileRoute, useRouteContext } from "@tanstack/react-router";

export const Route = createFileRoute("/_authd/$orgSlug/_onboarding/onboarding")(
  {
    component: MainOnboardingForm,
  }
);

const STEPS = [
  {
    label: "Setup your project",
    description: "Don't worry you can create more later",
    Component: SetupProject,
  },
  // {
  //   label: "Generate API Key",
  //   description:
  //     "Setup your credentials for your project. You can create more or edit this one later",
  //   Component: GenAPIKey,
  // },
  // {
  //   label: "Send your first event",
  //   description:
  //     "Let's test out your setup by sending your first event to your project",
  //   Component: TestAPIKey,
  // },
];

export function MainOnboardingForm() {
  const { currentUserOrg } = useRouteContext({
    from: "/_authd/$orgSlug/_onboarding/onboarding",
  });

  let initialStep = 0;
  if (currentUserOrg.organization.projects.length > 0) {
    initialStep += 1;
    if (
      currentUserOrg.organization.projects?.[0].api_keys &&
      currentUserOrg.organization.projects[0].api_keys.length > 0
    )
      initialStep += 1;
  }

  const [activeStep, setActiveStep] = useState(initialStep);
  const [currentStep, setCurrentStep] = useState(initialStep);

  const nextStep = async () => {
    setActiveStep((prev) => (prev + 1 < STEPS.length ? prev + 1 : prev));
    setCurrentStep((prev) => (prev + 1 < STEPS.length ? prev + 1 : prev));
  };
  const prevStep = () => {
    setActiveStep((prev) => (prev - 1 >= 0 ? prev - 1 : prev));
    setCurrentStep((prev) => (prev - 1 >= 0 ? prev - 1 : prev));
  };

  return (
    <div className="mt-16 flex flex-col gap-8">
      <div className="relative mx-3.5 flex size-10 shrink-0 items-center justify-center rounded-full bg-[#E1FF80]/40 text-pink/40 after:absolute after:top-[calc(100%+1px)] after:h-8 after:w-px after:bg-[hsl(74,100%,40%)]">
        <ZapIcon className="size-5 fill-current stroke-none" />
      </div>
      <Accordion
        type="single"
        collapsible
        className="flex flex-col gap-8 [&>div:not(:last-child)]:relative [&>div:not(:last-child)]:after:absolute [&>div:not(:last-child)]:after:left-8 [&>div:not(:last-child)]:after:top-[calc(100%+1px)] [&>div:not(:last-child)]:after:h-8 [&>div:not(:last-child)]:after:w-px [&>div:not(:last-child)]:after:bg-[hsl(74,100%,40%)]"
        value={`step-${currentStep}`}
        onValueChange={(v) => setCurrentStep(Number(v.split("-")[1]))}
      >
        {STEPS.map(({ label, description, Component }, i) => (
          <AccordionItem
            key={`step-${i}`}
            value={`step-${i}`}
            className={cn(
              "border p-6",
              activeStep === i && "border-[hsl(74,100%,40%)]"
            )}
          >
            <AccordionTrigger className="p-0" disabled={activeStep < i}>
              <div className="flex items-center gap-4">
                <div className="flex size-5 items-center justify-center rounded-full bg-[#E1FF80] text-[10px] font-semibold text-primary">
                  {i + 1}
                </div>
                <span className="font-semibold">{label}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="my-px px-px pb-0 pl-[calc(1.25rem+1rem)]">
              <p className="mb-4 mt-1 text-sm text-muted-foreground">
                {description}
              </p>
              <Component steps={{ next: nextStep, prev: prevStep }} />
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
