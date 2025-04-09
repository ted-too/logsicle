import { getProject, listProjects } from "@/server/teams/projects";
import { queryOptions } from "@tanstack/react-query";

export const projectsQueryKey = ["projects"];

export const projectQueryKey = (projectId: string) => ["projects", projectId];

export const getProjectsQueryOptions = () =>
	queryOptions({
		queryKey: [...projectsQueryKey],
		queryFn: async () => {
			const { data, error } = await listProjects();
			if (error) return Promise.reject(error);
			return data;
		},
	});

export const getProjectQueryOptions = (projectId: string) =>
	queryOptions({
		queryKey: projectQueryKey(projectId),
		queryFn: async () => {
			const { data, error } = await getProject({ data: { projectId } });
			if (error) return Promise.reject(error);
			return data;
		},
	});
