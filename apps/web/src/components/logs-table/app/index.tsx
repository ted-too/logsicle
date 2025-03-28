"use client";

import * as React from "react";
import { DataTableInfinite } from "../data-table-infinite";
import { filterFields as defaultFilterFields, sheetFields } from "./fields";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useResetFocus } from "@/hooks/use-hot-key";
import { getLevelRowClassName } from "@/lib/request/level";
import { cn } from "@/lib/utils";
import { LiveRow } from "../_components/live-row";
import { useRouteContext, useSearch } from "@tanstack/react-router";
import { appLogColumns } from "./columns";
import { getAppLogsQueryOptions } from "@/qc/resources/app";
import { getFacetedMinMaxValues } from "@/qc/utils";
import { getFacetedUniqueValues } from "@/qc/utils";
import { useAppLogStream } from "@/hooks/stream/use-app-log-stream";
// import { useAppLogStream } from "@/hooks/stream/use-app-log-stream";
// import { AppLog } from "@repo/api";

export function AppLogsTable() {
	// Don't pass tail to the query options
	const { tail, ...searchParams } = useSearch({
		from: "/_authd/$orgSlug/$projSlug/_dashboard/app-logs",
	});
	const { currentProject } = useRouteContext({
		from: "/_authd/$orgSlug/$projSlug/_dashboard/app-logs",
	});
	const queryOptions = getAppLogsQueryOptions(currentProject.id, searchParams);
	const {
		data,
		isFetching,
		isLoading,
		fetchNextPage,
		fetchPreviousPage,
		refetch,
	} = useInfiniteQuery(queryOptions);

	const { logs: liveRows } = useAppLogStream(currentProject.id, searchParams, {
		enabled: tail,
		onEnd: refetch,
	});

	const flatData = React.useMemo(
		() => data?.pages?.flatMap((page) => page.data ?? []) ?? [],
		[data?.pages],
	);

	useResetFocus();

	const lastPage = data?.pages?.[data?.pages.length - 1];
	const totalDBRowCount =
		(lastPage?.meta?.pagination?.totalRowCount ?? 0) + liveRows.length;
	const filterDBRowCount =
		(lastPage?.meta?.pagination?.totalFilteredRowCount ?? 0) + liveRows.length;
	const totalFetched = flatData?.length + liveRows.length;
	const facets = lastPage?.meta?.facets;
	const combinedData = [...liveRows, ...flatData];

	const { sort, start, limit, end, interval, page, ...filter } = searchParams;

	// REMINDER: this is currently needed for the cmdk search
	// TODO: auto search via API when the user changes the filter instead of hardcoded
	const filterFields = React.useMemo(() => {
		return defaultFilterFields.map((field) => {
			const facetsField = facets?.[field.value];
			if (!facetsField) return field;
			if (field.options && field.options.length > 0) return field;

			// REMINDER: if no options are set, we need to set them via the API
			const options = facetsField.rows.map(({ value }) => {
				return {
					label: `${value}`,
					value,
				};
			});

			return { ...field, options };
		});
	}, [facets]);

	return (
		<DataTableInfinite
			type="app"
			columns={appLogColumns}
			data={combinedData}
			totalRows={totalDBRowCount}
			filterRows={filterDBRowCount}
			totalRowsFetched={totalFetched}
			defaultColumnFilters={Object.entries(filter)
				.map(([key, value]) => ({
					id: key,
					value,
				}))
				.filter(({ value }) => value ?? undefined)}
			defaultRowSelection={
				searchParams.id ? { [searchParams.id]: true } : undefined
			}
			// FIXME: make it configurable - TODO: use `columnHidden: boolean` in `filterFields`
			defaultColumnVisibility={{
				id: false,
				function: false,
				host: false,
				service_name: false,
				caller: false,
				version: false,
			}}
			meta={{}}
			filterFields={filterFields}
			sheetFields={sheetFields}
			isFetching={isFetching}
			isLoading={isLoading}
			fetchNextPage={fetchNextPage}
			fetchPreviousPage={fetchPreviousPage}
			refetch={refetch}
			getRowClassName={(row) => {
				const rowTimestamp = new Date(row.original.timestamp).getTime();
				const latestLiveRowTimestamp = liveRows[0]?.timestamp;
				const isPast = latestLiveRowTimestamp
					? rowTimestamp <= new Date(latestLiveRowTimestamp).getTime()
					: false;
				const levelClassName = getLevelRowClassName(row.original.level);
				return cn(levelClassName, isPast ? "opacity-50" : "opacity-100");
			}}
			getRowId={(row) => row.id}
			getFacetedUniqueValues={getFacetedUniqueValues(facets)}
			getFacetedMinMaxValues={getFacetedMinMaxValues(facets)}
			renderLiveRow={(props) => {
				if (!liveRows[0]?.timestamp) return null;
				if (props?.row.original.id !== liveRows[0]?.id) return null;
				return <LiveRow type="app" />;
			}}
		/>
	);
}
