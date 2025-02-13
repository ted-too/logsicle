import { projectsQueries } from "@/qc/queries/projects";
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authd/_app/dashboard/")({
  beforeLoad: async ({ context }) => {
    const projects = await context.queryClient.ensureQueryData(
      projectsQueries.listQueryOptions()
    );
    if (projects.length === 0) {
      throw redirect({
        to: "/dashboard/onboarding",
      });
    }
    throw redirect({
      to: "/dashboard/$projId",
      params: { projId: projects[0].id },
    });
  },
});
