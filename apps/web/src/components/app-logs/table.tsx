import { toast } from "@/components/ui/sonner-wrapper";
import { appLogsQueries } from "@/qc/queries/app-logs";
import { syncCountAtom } from "@/stores/generic-filter";
import { useParams, useRouterState } from "@tanstack/react-router";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useSetAtom } from "jotai";
import {
  CSSProperties,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { columns } from "./columns";
// import useResizeObserver from "@react-hook/resize-observer";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useLogStream } from "@/hooks/use-log-stream";
import { cn } from "@/lib/utils";
import { AppLog, GetAppLogsParams, PaginatedResponse } from "@repo/api";
import { useQueryClient } from "@tanstack/react-query";
import {
  Column,
  ColumnSizingState,
  flexRender,
  getCoreRowModel,
  useReactTable,
  VisibilityState,
  type RowData,
} from "@tanstack/react-table";
import {
  ArrowLeftToLine,
  ArrowRightToLine,
  Ellipsis,
  PinOff,
} from "lucide-react";

declare module "@tanstack/react-table" {
  interface ColumnMeta<TData extends RowData, TValue> {
    minSize: string | number;
  }
  interface TableMeta<TData extends RowData> {
    containerRef: React.RefObject<HTMLDivElement | null>;
  }
}

// Helper function to compute pinning styles for columns
const getPinningStyles = (
  column: Column<AppLog>,
  isHeader = false
): CSSProperties => {
  const isPinned = column.getIsPinned();

  return {
    left: isPinned === "left" ? `${column.getStart("left")}px` : undefined,
    right: isPinned === "right" ? `${column.getAfter("right")}px` : undefined,
    position: isPinned ? "sticky" : "relative",
    width: column.getSize(),
    minWidth: column.columnDef.meta?.minSize,
    zIndex: isPinned ? 2 : 0,
    flex: `0 0 ${column.getSize()}px`,
    display: "flex",
    alignItems: "center",
    height: "100%",
    backgroundColor: isHeader ? "#FAFAFA" : undefined,
  };
};

export function AppLogTable({ className }: { className?: string }) {
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
          return prev ? {
            ...prev,
            pages: [
              {
                ...prev.pages[0],
                data: [log.data, ...prev.pages[0].data]
              },
              ...prev.pages.slice(1)
            ],
            totalRowCount: prev.totalRowCount + 1,
            totalFilteredRowCount: prev.totalFilteredRowCount + 1
          } : {
            pageParams: [{ page: 0 }],
            pages: [{ data: [log.data], totalCount: 1 }],
            totalRowCount: 1,
            totalFilteredRowCount: 1
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
    },
  });

  const rows = table.getRowModel().rows;
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    estimateSize: () => 37,
    getScrollElement: () => containerRef.current,
    measureElement:
      typeof window !== "undefined" &&
      navigator.userAgent.indexOf("Firefox") === -1
        ? (element) => element?.getBoundingClientRect().height
        : undefined,
    overscan: 5,
  });
  const virtualRows = rowVirtualizer.getVirtualItems();

  useEffect(() => {
    if (!error) return;
    toast.APIError(error);
  }, [error]);

  return (
    <Table
      containerClassName={className}
      className="table-fixed border-separate text-xs font-mono border-spacing-0 [&_td]:border-border [&_tfoot_td]:border-t [&_th]:border-b [&_th]:border-border [&_tr:not(:last-child)_td]:border-b [&_tr]:border-none"
      onViewportScroll={(e) =>
        fetchMoreOnBottomReached(e.target as HTMLDivElement)
      }
      ref={containerRef}
    >
      <TableHeader className="sticky top-0 z-10 bg-[#FAFAFA]">
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow
            key={headerGroup.id}
            style={{
              display: "flex", // Make header row flex like body rows
              width: "100%",
            }}
          >
            {headerGroup.headers.map((header, hIdx) => {
              const { column } = header;
              const isPinned = column.getIsPinned();
              const isLastLeftPinned =
                isPinned === "left" && column.getIsLastColumn("left");
              const isFirstRightPinned =
                isPinned === "right" && column.getIsFirstColumn("right");
              return (
                <TableHead
                  key={header.id}
                  className="relative h-9 truncate [&:not([data-pinned]):has(+[data-pinned])_div.cursor-col-resize:last-child]:opacity-0 [&[data-last-col=left]_div.cursor-col-resize:last-child]:opacity-0 [&[data-pinned=left][data-last-col=left]]:border-r [&[data-pinned=right]:last-child_div.cursor-col-resize:last-child]:opacity-0 [&[data-pinned=right][data-last-col=right]]:border-l [&[data-pinned][data-last-col]]:border-border [&[data-pinned]]:bg-muted/90 [&[data-pinned]]:backdrop-blur-sm"
                  colSpan={header.colSpan}
                  style={{ ...getPinningStyles(column, true) }}
                  data-pinned={isPinned || undefined}
                  data-last-col={
                    isLastLeftPinned
                      ? "left"
                      : isFirstRightPinned
                        ? "right"
                        : undefined
                  }
                >
                  <div className="flex items-center justify-between gap-2 w-full">
                    <span className="truncate uppercase">
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </span>
                    {/* Pin/Unpin column controls with enhanced accessibility */}
                    {!header.isPlaceholder &&
                      header.column.getCanPin() &&
                      (header.column.getIsPinned() ? (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="-mr-1 size-7 shadow-none"
                          onClick={() => header.column.pin(false)}
                          aria-label={`Unpin ${header.column.columnDef.header as string} column`}
                          title={`Unpin ${header.column.columnDef.header as string} column`}
                        >
                          <PinOff
                            className="opacity-60"
                            size={16}
                            strokeWidth={2}
                            aria-hidden="true"
                          />
                        </Button>
                      ) : (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="-mr-1 size-7 shadow-none"
                              aria-label={`Pin options for ${header.column.columnDef.header as string} column`}
                              title={`Pin options for ${header.column.columnDef.header as string} column`}
                            >
                              <Ellipsis
                                className="opacity-60"
                                size={16}
                                strokeWidth={2}
                                aria-hidden="true"
                              />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => header.column.pin("left")}
                              className="text-xs [&>svg]:size-3.5"
                            >
                              <ArrowLeftToLine
                                size={14}
                                strokeWidth={2}
                                className="opacity-60"
                                aria-hidden="true"
                              />
                              Stick to left
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => header.column.pin("right")}
                              className="text-xs [&>svg]:size-3.5"
                            >
                              <ArrowRightToLine
                                size={14}
                                strokeWidth={2}
                                className="opacity-60"
                                aria-hidden="true"
                              />
                              Stick to right
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ))}
                    {header.column.getCanResize() && (
                      <div
                        {...{
                          onDoubleClick: () => header.column.resetSize(),
                          onMouseDown: header.getResizeHandler(),
                          onTouchStart: header.getResizeHandler(),
                          className: cn(
                            "absolute top-0 h-full w-4 cursor-col-resize user-select-none touch-none -right-2 z-10 flex justify-center before:absolute before:w-px before:inset-y-0 before:bg-border before:-translate-x-px",
                            hIdx === columns.length - 1 &&
                              "before:bg-transparent"
                          ),
                        }}
                      />
                    )}
                  </div>
                </TableHead>
              );
            })}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody
        style={{
          display: "grid",
          height: `${rowVirtualizer.getTotalSize()}px`, //tells scrollbar how big the table is
          position: "relative", //needed for absolute positioning of rows
        }}
      >
        {virtualRows.length > 0 ? (
          virtualRows.map((virtualRow) => {
            const row = rows[virtualRow.index];
            return (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && "selected"}
                style={{
                  position: "absolute",
                  transform: `translateY(${virtualRow.start}px)`, //this should always be a `style` as it changes on scroll
                  width: "100%",
                  height: 37,
                  display: "flex",
                }}
              >
                {row.getVisibleCells().map((cell) => {
                  const { column } = cell;
                  const isPinned = column.getIsPinned();
                  const isLastLeftPinned =
                    isPinned === "left" && column.getIsLastColumn("left");
                  const isFirstRightPinned =
                    isPinned === "right" && column.getIsFirstColumn("right");
                  return (
                    <TableCell
                      key={cell.id}
                      className="truncate [&[data-pinned=left][data-last-col=left]]:border-r [&[data-pinned=right][data-last-col=right]]:border-l [&[data-pinned][data-last-col]]:border-border [&[data-pinned]]:bg-background/90 [&[data-pinned]]:backdrop-blur-sm"
                      style={{ ...getPinningStyles(column) }}
                      data-pinned={isPinned || undefined}
                      data-last-col={
                        isLastLeftPinned
                          ? "left"
                          : isFirstRightPinned
                            ? "right"
                            : undefined
                      }
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            );
          })
        ) : (
          <TableRow>
            <TableCell colSpan={columns.length} className="h-24 text-center">
              No results.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
