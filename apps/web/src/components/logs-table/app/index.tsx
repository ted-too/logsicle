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
import { appDataOptions } from "../query-options";
import { appLogColumns } from "./columns";
import { useLiveMode } from "@/hooks/use-live-mode";
import { getFacetedUniqueValues } from "../utils";
import { getFacetedMinMaxValues } from "../utils";

export function AppLogsTable() {
  const searchParams = useSearch({
    from: "/_authd/$orgSlug/$projSlug/_dashboard/app-logs",
  });
  const { currentProject } = useRouteContext({
    from: "/_authd/$orgSlug/$projSlug/_dashboard/app-logs",
  });
  const {
    data,
    isFetching,
    isLoading,
    fetchNextPage,
    fetchPreviousPage,
    refetch,
  } = useInfiniteQuery(appDataOptions(currentProject.id, searchParams));

  const flatData = React.useMemo(
    () => data?.pages?.flatMap((page) => page.data ?? []) ?? [],
    [data?.pages]
  );

  useResetFocus();

  const liveMode = useLiveMode(flatData, { tail: searchParams.tail });

  const lastPage = data?.pages?.[data?.pages.length - 1];
  const totalDBRowCount = lastPage?.meta?.pagination?.totalRowCount;
  const filterDBRowCount = lastPage?.meta?.pagination?.totalFilteredRowCount;
  const totalFetched = flatData?.length;
  const facets = lastPage?.meta?.facets;

  // const metadata = lastPage?.meta?.metadata;
  // const chartData = lastPage?.meta?.chartData;

  const { sort, start, limit, end, tail, interval, page, ...filter } =
    searchParams;

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
      data={flatData}
      totalRows={totalDBRowCount}
      filterRows={filterDBRowCount}
      totalRowsFetched={totalFetched}
      defaultColumnFilters={Object.entries(filter)
        .map(([key, value]) => ({
          id: key,
          value,
        }))
        .filter(({ value }) => value ?? undefined)}
      defaultColumnSorting={sort ? [sort] : undefined}
      defaultRowSelection={
        searchParams.id ? { [searchParams.id]: true } : undefined
      }
      // FIXME: make it configurable - TODO: use `columnHidden: boolean` in `filterFields`
      defaultColumnVisibility={{
        id: false,
        // TODO: add the rest of the columns
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
        const isPast = rowTimestamp <= (liveMode.timestamp || -1);
        const levelClassName = getLevelRowClassName(row.original.level);
        return cn(levelClassName, isPast ? "opacity-50" : "opacity-100");
      }}
      getRowId={(row) => row.id}
      getFacetedUniqueValues={getFacetedUniqueValues(facets)}
      getFacetedMinMaxValues={getFacetedMinMaxValues(facets)}
      renderLiveRow={(props) => {
        if (!liveMode.timestamp) return null;
        if (props?.row.original.id !== liveMode?.row?.id) return null;
        return <LiveRow type="app" />;
      }}
    />
  );
}
