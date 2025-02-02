import { projectsQueries } from "@/qc/queries/projects";
import { createFileRoute, notFound, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authd/_app/dashboard/$projId/alerts")({
  loader: async ({ params, context }) => {
    const projects = await context.queryClient.ensureQueryData(
      projectsQueries.listQueryOptions()
    );
    if (projects.length === 0) {
      throw redirect({
        to: "/dashboard/onboarding",
      });
    }
    const project = projects.find((p) => p.id === params.projId);
    if (!project) {
      throw notFound();
    }
    return project;
  },
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/_authd/_app/dashboard/$projId/alerts"!</div>;
}
