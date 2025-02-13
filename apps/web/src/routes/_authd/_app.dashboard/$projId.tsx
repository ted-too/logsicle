import { projectsQueries } from "@/qc/queries/projects";
import { createFileRoute, notFound } from "@tanstack/react-router";

export const Route = createFileRoute("/_authd/_app/dashboard/$projId")({
  beforeLoad: async ({ params, context }) => {
    const project = await context.queryClient.ensureQueryData(
      projectsQueries.getByIdQueryOptions(params.projId)
    );

    if (!project) {
      throw notFound();
    }

    return { project };
  },
});
