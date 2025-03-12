import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authd/$orgSlug/_onboarding/")({
  component: Home,
});

function Home() {
  const { currentUserOrg } = Route.useRouteContext();

  return (
    <div className="flex min-h-svh w-full flex-col items-center gap-10 py-10">
      <div className="flex flex-col gap-4 items-center text-center">
        <h1 className="text-2xl font-bold">
          Select a project ({currentUserOrg.organization.name})
        </h1>
        <p className="text-gray-600">Select a project to continue.</p>
      </div>
      {/* TODO: Make this better and add a create project button */}
      {currentUserOrg.organization.projects.map((proj) => (
        <Link
          key={proj.id}
          to="/$orgSlug/$projSlug"
          params={{
            orgSlug: currentUserOrg.organization.slug,
            projSlug: proj.slug,
          }}
          className="rounded-md border border-gray-200 p-4 hover:bg-gray-50 transition-colors"
        >
          {proj.name}
        </Link>
      ))}
    </div>
  );
}
