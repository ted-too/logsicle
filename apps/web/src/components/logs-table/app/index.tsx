"use client";

import { DataTableInfinite } from "@/components/data-table";
import { useAppLogStream } from "@/hooks/stream/use-app-log-stream";
import { useResetFocus } from "@/hooks/use-hot-key";
import { getLevelRowClassName } from "@/lib/request/level";
import { cn } from "@/lib/utils";
import { getAppLogsQueryOptions } from "@/qc/resources/app";
import { getFacetedMinMaxValues } from "@/qc/utils";
import { getFacetedUniqueValues } from "@/qc/utils";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useRouteContext, useSearch } from "@tanstack/react-router";
import * as React from "react";
import { LiveRow } from "../live-row";
import { appLogColumns } from "./columns";
import { filterFields as defaultFilterFields, sheetFields } from "./fields";

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
	const filterFields = React.useMemo(() => {
		return defaultFilterFields.map((field) => {
			const facetsField = facets?.[field.value];
			if (!facetsField) return field;
			if (field.options && field.options.length > 0) return field;

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
			defaultColumnVisibility={{
				id: false,
				function: false,
				host: false,
				service_name: false,
				caller: false,
				version: false,
				environment: false,
			}}
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
