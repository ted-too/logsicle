import type { SearchParams as AppLogSearchParams } from "@/routes/_authd/$orgSlug/$projSlug/_dashboard/app-logs";
import type { SearchParams as RequestLogSearchParams } from "@/routes/_authd/$orgSlug/$projSlug/_dashboard/request-logs";
import { appLogFilterSchema, requestLogFilterSchema } from "@repo/api";
import { zodKeys } from "@repo/api";
import { useNavigate } from "@tanstack/react-router";
import { useSearch } from "@tanstack/react-router";
import { useCallback } from "react";

export function useTableSearchParams({ type }: { type: "app" | "request" }) {
	const search = useSearch({
		from:
			type === "app"
				? "/_authd/$orgSlug/$projSlug/_dashboard/app-logs"
				: "/_authd/$orgSlug/$projSlug/_dashboard/request-logs",
	}) as AppLogSearchParams | RequestLogSearchParams;

	const navigate = useNavigate({
		from:
			type === "app"
				? "/$orgSlug/$projSlug/app-logs"
				: "/$orgSlug/$projSlug/request-logs",
	});

	const setSearch = useCallback(
		(params: Partial<AppLogSearchParams | RequestLogSearchParams>) => {
			navigate({
				search: (prev) => ({ ...prev, ...params }),
			});
		},
		[navigate],
	);

	const filterKeys = zodKeys(
		type === "app" ? appLogFilterSchema : requestLogFilterSchema,
	);

	return {
		search,
		filterKeys: [...filterKeys, "timestamp"],
		setSearch,
	};
}
