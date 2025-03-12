import { toast } from "@/components/ui/sonner-wrapper";
import { Table } from "@/components/ui/table";
import { useLogStream } from "@/hooks/use-log-stream";
import { appLogsQueries } from "@/qc/queries/app-logs";
import { syncCountAtom } from "@/stores/generic-filter";
import useResizeObserver from "@react-hook/resize-observer";
import { AppLog, GetAppLogsParams, PaginatedResponse } from "@repo/api";
import { useQueryClient } from "@tanstack/react-query";
import { useParams, useRouterState } from "@tanstack/react-router";
import {
  ColumnSizingState,
  getCoreRowModel,
  useReactTable,
  VisibilityState,
  type RowData,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useSetAtom } from "jotai";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Body, TableHeaderComponent } from "./body";
import { columns } from "./columns";

declare module "@tanstack/react-table" {
  interface ColumnMeta<TData extends RowData, TValue> {
    minSize: string | number;
  }
  interface TableMeta<TData extends RowData> {
    containerRef: React.RefObject<HTMLDivElement | null>;
    handleResize: (containerWidth: number) => void;
  }
}

export function AppLogTable({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  const { projId } = useParams({
    from: "/_authd/_app/dashboard/$projId/logs",
  });
  const search = useRouterState({
    select: (state) => state.location.search,
  }) as GetAppLogsParams & { tail: boolean | undefined };

  const { data, error, isFetching, fetchNextPage, hasNextPage } =
    appLogsQueries.list.useInfiniteQuery(projId, {
      ...search,
      // @ts-expect-error tail is not in GetAppLogsParams
      tail: undefined,
    });

  const queryClient = useQueryClient();
  useLogStream(projId, {
    enabled: search.tail ?? false,
    types: ["app"],
    callback: (log) => {
      queryClient.setQueryData(
        [
          "projects",
          projId,
          "app-logs",
          {
            ...search,
            tail: undefined,
          },
        ],
        (
          prev:
            | {
                pageParams: {
                  page: number;
                }[];
                pages: PaginatedResponse<AppLog>[];
                totalRowCount: number;
                totalFilteredRowCount: number;
              }
            | undefined
        ) => {
          return prev
            ? {
                ...prev,
                pages: [
                  {
                    ...prev.pages[0],
                    data: [log.data, ...prev.pages[0].data],
                  },
                  ...prev.pages.slice(1),
                ],
                totalRowCount: prev.totalRowCount + 1,
                totalFilteredRowCount: prev.totalFilteredRowCount + 1,
              }
            : {
                pageParams: [{ page: 0 }],
                pages: [{ data: [log.data], totalCount: 1 }],
                totalRowCount: 1,
                totalFilteredRowCount: 1,
              };
        }
      );
    },
  });

  const flatData = useMemo(
    () => data?.pages?.flatMap((page) => page.data) ?? [],
    [data]
  );

  const syncCount = useSetAtom(syncCountAtom);

  // Update global state
  useEffect(() => {
    syncCount({
      totalRowCount: data?.totalRowCount ?? 0,
      totalFilteredRowCount: data?.totalFilteredRowCount ?? 0,
    });
  }, [data, flatData, syncCount]);

  const containerRef = useRef<HTMLTableElement>(null);

  // called on scroll and possibly on mount to fetch more data as the user scrolls and reaches bottom of table
  const fetchMoreOnBottomReached = useCallback(
    (containerRefElement?: HTMLDivElement | null) => {
      if (containerRefElement) {
        const { scrollHeight, scrollTop, clientHeight } = containerRefElement;

        // once the user has scrolled within 500px of the bottom of the table, fetch more data if we can
        if (
          scrollHeight - scrollTop - clientHeight < 500 &&
          !isFetching &&
          hasNextPage
        ) {
          console.log("fetching more data");
          fetchNextPage();
        }
      }
    },
    [fetchNextPage, hasNextPage, isFetching]
  );

  // a check on mount and after a fetch to see if the table is already scrolled to the bottom and immediately needs to fetch more data
  useEffect(() => {
    fetchMoreOnBottomReached(containerRef.current);
  }, [fetchMoreOnBottomReached]);

  const [colSizing, setColSizing] = useState<ColumnSizingState>({});
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  const handleResize = useCallback(
    (containerWidth: number) => {
      const tableElement = containerRef.current;
      if (!tableElement) return;

      // Get all th elements
      const thElements = tableElement.querySelectorAll("th");
      const columnId = "fields"; // The column we want to resize

      // Calculate total width of other columns
      let otherColumnsWidth = 0;
      thElements.forEach((th) => {
        if (th.getAttribute("data-column-id") !== columnId) {
          otherColumnsWidth += th.getBoundingClientRect().width;
        }
      });
      // Calculate new width for the fields column
      let newFieldWidth = Math.max(200, containerWidth - otherColumnsWidth);

      if (newFieldWidth + otherColumnsWidth > containerWidth) {
        // If the new width is larger than the container,
        newFieldWidth = containerWidth - otherColumnsWidth; // Set it to the remaining space
      }

      // Update column sizing
      setColSizing((prev) => ({
        ...prev,
        [columnId]: newFieldWidth,
      }));
    },
    [containerRef, setColSizing]
  );

  const table = useReactTable({
    data: flatData,
    columns,
    enableColumnResizing: true,
    columnResizeMode: "onChange",
    onColumnSizingChange: setColSizing,
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      columnSizing: colSizing,
      columnVisibility,
    },
    getCoreRowModel: getCoreRowModel(),
    meta: {
      containerRef,
      handleResize,
    },
  });

  const allHeaders = table.getFlatHeaders();
  const columnSizeVars = useMemo(() => {
    const headers = allHeaders;
    const colSizes: { [key: string]: number } = {};
    for (let i = 0; i < headers.length; i++) {
      const header = headers[i]!;
      colSizes[`--col-${header.column.id}-size`] = header.column.getSize();
    }
    return colSizes;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allHeaders, colSizing]);

  const rowVirtualizer = useVirtualizer({
    count: flatData.length,
    estimateSize: () => 37,
    getScrollElement: () => containerRef.current,
    measureElement:
      typeof window !== "undefined" &&
      navigator.userAgent.indexOf("Firefox") === -1
        ? (element) => element?.getBoundingClientRect().height
        : undefined,
    overscan: 5,
  });

  useEffect(() => {
    if (!error) return;
    toast.APIError(error);
  }, [error]);

  useResizeObserver(containerRef, (entry) => {
    if (!entry) return;
    handleResize(entry.contentRect.width);
  });

  return (
    <Table
      containerClassName={className}
      className="table-fixed border-separate text-xs font-mono border-spacing-0 [&_td]:border-border [&_tfoot_td]:border-t [&_th]:border-b [&_th]:border-border [&_tr:not(:last-child)_td]:border-b [&_tr]:border-none"
      onViewportScroll={(e) =>
        fetchMoreOnBottomReached(e.target as HTMLDivElement)
      }
      style={{ ...columnSizeVars, ...style }}
      ref={containerRef}
    >
      <TableHeaderComponent table={table} tableState={table.getState()} />
      <Body table={table} rowVirtualizer={rowVirtualizer} />
    </Table>
  );
}
