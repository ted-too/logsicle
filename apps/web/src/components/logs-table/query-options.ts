import type { FacetMetadataSchema } from "./utils";
import { infiniteQueryOptions, keepPreviousData } from "@tanstack/react-query";
import type { Percentile } from "@/lib/request/percentile";
import type {
	ListRequestLogsRequest,
	ListAppLogsRequest,
	AppLog,
	RequestLog,
	PaginationMeta,
} from "@repo/api";
import { listRequestLogs } from "@/server/resources/request";
import { listAppLogs } from "@/server/resources/app";
import { appLogsQueryKey } from "@/qc/resources/app";
import { requestLogsQueryKey } from "@/qc/resources/request";

export type LogsMeta = {
	currentPercentiles: Record<Percentile, number>;
};

export type InfiniteQueryResponse<TData = AppLog[] | RequestLog[]> = {
	data: TData;
	meta: { pagination: PaginationMeta; facets: Facets };
};

export const requestDataOptions = (
	projectId: string,
	query: ListRequestLogsRequest,
) => {
	return infiniteQueryOptions({
		queryKey: [...requestLogsQueryKey(projectId), query],
		queryFn: async ({ pageParam }) => {
			const { data, error } = await listRequestLogs({
				data: {
					projectId,
					query: { ...query, page: pageParam },
				},
			});
			if (error) return Promise.reject(error);
			return {
				data: data.data,
				meta: {
					pagination: data.meta,
					facets: getFacetsFromData(data.data),
				},
			} as InfiniteQueryResponse<RequestLog[]>;
		},
		initialPageParam: 1,
		getPreviousPageParam: ({ meta }) => {
			if (!meta.pagination.prevPage) return null;
			return meta.pagination.prevPage;
		},
		getNextPageParam: ({ meta }) => {
			if (!meta.pagination.nextPage) return null;
			return meta.pagination.nextPage;
		},
		refetchOnWindowFocus: false,
		placeholderData: keepPreviousData,
	});
};

export const appDataOptions = (
	projectId: string,
	query: ListAppLogsRequest,
) => {
	return infiniteQueryOptions({
		queryKey: [...appLogsQueryKey(projectId), query],
		queryFn: async ({ pageParam }) => {
			const { data, error } = await listAppLogs({
				data: {
					projectId,
					query: { ...query, page: pageParam },
				},
			});
			if (error) return Promise.reject(error);
			return {
				data: data.data,
				meta: {
					pagination: data.meta,
					facets: getFacetsFromData(data.data),
				},
			} as InfiniteQueryResponse<AppLog[]>;
		},
		initialPageParam: 1,
		getPreviousPageParam: ({ meta }) => {
			if (!meta.pagination.prevPage) return null;
			return meta.pagination.prevPage;
		},
		getNextPageParam: ({ meta }) => {
			if (!meta.pagination.nextPage) return null;
			return meta.pagination.nextPage;
		},
		refetchOnWindowFocus: false,
		placeholderData: keepPreviousData,
	});
};

interface Facets {
	[k: string]: {
		rows: {
			// biome-ignore lint/suspicious/noExplicitAny: dw about it
			value: any;
			total: number;
		}[];
		total: number;
		min: number | undefined;
		max: number | undefined;
	};
}

function getFacetsFromData(data: RequestLog[] | AppLog[]): Facets {
	const valuesMap = data.reduce((prev, curr) => {
		for (const [key, value] of Object.entries(curr)) {
			if (key === "level" || key === "region" || key === "latency") {
				// Convert array values (like regions) to string
				const _value = Array.isArray(value) ? value.toString() : value;
				const total = prev.get(key)?.get(_value) || 0;
				if (prev.has(key) && _value) {
					prev.get(key)?.set(_value, total + 1);
				} else if (_value) {
					prev.set(key, new Map([[_value, 1]]));
				}
			}
		}
		return prev;
		// biome-ignore lint/suspicious/noExplicitAny: dw about it
	}, new Map<string, Map<any, number>>());

	const facets = Object.fromEntries(
		Array.from(valuesMap.entries()).map(([key, valueMap]) => {
			let min: number | undefined;
			let max: number | undefined;
			const rows = Array.from(valueMap.entries()).map(([value, total]) => {
				if (typeof value === "number") {
					if (!min) min = value;
					else min = value < min ? value : min;
					if (!max) max = value;
					else max = value > max ? value : max;
				}
				return {
					value,
					total,
				};
			});
			const total = Array.from(valueMap.values()).reduce((a, b) => a + b, 0);
			return [key, { rows, total, min, max }];
		}),
	);

	return facets satisfies Record<string, FacetMetadataSchema>;
}
