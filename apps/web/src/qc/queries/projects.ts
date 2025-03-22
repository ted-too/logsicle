import { getProject, listProjects } from "@/server/projects";
import { BetterFetchError } from "@better-fetch/fetch";
import { Project, ProjectWithLastActivity } from "@repo/api";
import { queryOptions } from "@tanstack/react-query";

export const projectsQueryKey = (organizationId?: string) =>
  organizationId ? ["projects", organizationId] : ["projects"];

export const projectByIdQueryKey = (projectId: string) => [
  "projects",
  projectId,
];

export const getProjectsQueryOptions = (organizationId?: string) =>
  queryOptions<Project[], BetterFetchError>({
    queryKey: projectsQueryKey(organizationId),
    queryFn: async () => {
      const { data, error } = await listProjects({
        data: { organizationId },
      });
      if (error) return Promise.reject(error);
      return data;
    },
  });

export const getProjectByIdQueryOptions = (projectId: string) =>
  queryOptions<ProjectWithLastActivity, BetterFetchError>({
    queryKey: projectByIdQueryKey(projectId),
    queryFn: async () => {
      const { data, error } = await getProject({
        data: { projectId },
      });
      if (error) return Promise.reject(error);
      return data;
    },
  });
