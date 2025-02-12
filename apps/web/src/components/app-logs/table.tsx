import { toast } from "@/components/ui/sonner-wrapper";
import { appLogsQueries } from "@/qc/queries/app-logs";
import { filteredResultsAtom, totalResultsAtom } from "@/stores/generic-filter";
import { useParams, useRouterState } from "@tanstack/react-router";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useAtom } from "jotai";
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
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
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
import { AppLog } from "@repo/api";
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
import { cn } from "@/lib/utils";
import { Setting3 } from "iconsax-react";

declare module "@tanstack/react-table" {
  interface ColumnMeta<TData extends RowData, TValue> {
    minSize: string | number;
  }
  interface TableMeta<TData extends RowData> {
    containerRef: React.RefObject<HTMLDivElement | null>;
  }
}

// Helper function to compute pinning styles for columns
const getPinningStyles = (column: Column<AppLog>): CSSProperties => {
  const isPinned = column.getIsPinned();
  return {
    left: isPinned === "left" ? `${column.getStart("left")}px` : undefined,
    right: isPinned === "right" ? `${column.getAfter("right")}px` : undefined,
    position: isPinned ? "sticky" : "relative",
    width: column.getSize(),
    minWidth: column.columnDef.meta?.minSize,
    zIndex: isPinned ? 1 : 0,
  };
};

export function AppLogTable() {
  const { projId } = useParams({
    from: "/_authd/_app/dashboard/$projId/logs",
  });
  const search = useRouterState({
    select: (state) => state.location.search,
  });

  const containerRef = useRef<HTMLTableElement>(null);
  const {
    data,
    error,
    isFetching,
    fetchNextPage,
    // @ts-expect-error range is always default 24hrs
  } = appLogsQueries.list.useInfiniteQuery(projId, search);

  const flatData = useMemo(
    () => data?.pages?.flatMap((page) => page.data) ?? [],
    [data]
  );

  const [totalCount, setTotalCount] = useAtom(totalResultsAtom);
  const [filteredCount, setFilteredCount] = useAtom(filteredResultsAtom);

  // Update global state
  useEffect(() => {
    setTotalCount(data?.pages?.[0]?.totalCount ?? 0);
    setFilteredCount(flatData.length);
  }, [data, flatData, setFilteredCount, setTotalCount]);

  // called on scroll and possibly on mount to fetch more data as the user scrolls and reaches bottom of table
  const fetchMoreOnBottomReached = useCallback(
    (containerRefElement?: HTMLDivElement | null) => {
      if (containerRefElement) {
        const { scrollHeight, scrollTop, clientHeight } = containerRefElement;
        //once the user has scrolled within 500px of the bottom of the table, fetch more data if we can
        if (
          scrollHeight - scrollTop - clientHeight < 500 &&
          !isFetching &&
          filteredCount < totalCount
        ) {
          console.log("fetching more data");
          fetchNextPage();
        }
      }
    },
    [fetchNextPage, isFetching, filteredCount, totalCount]
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

  const rowVirtualizer = useVirtualizer({
    count: flatData.length,
    getScrollElement: () => containerRef.current,
    estimateSize: useCallback(() => 116, []),
    measureElement:
      typeof window !== "undefined" &&
      navigator.userAgent.indexOf("Firefox") === -1
        ? (element) => element?.getBoundingClientRect().height
        : undefined,
    overscan: 3,
  });

  useEffect(() => {
    if (!error) return;
    toast.APIError(error);
  }, [error]);

  // useResizeObserver(parentRef, (entry) => {
  //   if (!entry) return;

  //   const containerWidth = entry.contentRect.width;
  //   const titleColumnId = "fields"; // Adjust based on your column ID

  //   // Calculate remaining width after accounting for other columns
  //   const otherColumnsWidth = table
  //     .getFlatHeaders()
  //     .filter(({ id }) => id !== titleColumnId)
  //     .reduce((sum, h) => sum + h.getSize(), 0);

  //   // Set title column to fill remaining space
  //   const newTitleWidth = Math.max(200, containerWidth - otherColumnsWidth); // 200px minimum
  //   setColSizing((prev) => ({
  //     ...prev,
  //     [titleColumnId]: newTitleWidth,
  //   }));
  // });

  useEffect(() => {
    console.log(colSizing);
  }, [colSizing]);

  return (
    <Table
      className="table-fixed border-separate text-xs font-mono border-spacing-0 [&_td]:border-border [&_tfoot_td]:border-t [&_th]:border-b [&_th]:border-border [&_tr:not(:last-child)_td]:border-b [&_tr]:border-none"
      ref={containerRef}
    >
      <TableHeader>
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id} className="bg-muted/50">
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
                  <div className="flex items-center justify-between gap-2">
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
                            >
                              <ArrowLeftToLine
                                size={16}
                                strokeWidth={2}
                                className="opacity-60"
                                aria-hidden="true"
                              />
                              Stick to left
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => header.column.pin("right")}
                            >
                              <ArrowRightToLine
                                size={16}
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
      <TableBody>
        {table.getRowModel().rows?.length ? (
          table.getRowModel().rows.map((row) => (
            <TableRow
              key={row.id}
              data-state={row.getIsSelected() && "selected"}
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
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                );
              })}
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={columns.length} className="h-24 text-center">
              No results.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
    // <ScrollArea
    //   className="w-[calc(100%-3rem)] h-[calc(100svh-3rem-0.25rem-70px)]"
    //   onViewportScroll={(e) =>
    //     fetchMoreOnBottomReached(e.target as HTMLDivElement)
    //   }
    //   ref={parentRef}
    // >
    //   <div
    //     style={{
    //       height: `${rowVirtualizer.getTotalSize()}px`,
    //       width: "100%",
    //       position: "relative",
    //     }}
    //   >
    //     {rowVirtualizer.getVirtualItems().map((virtualRow) => (
    //       <div
    //         key={virtualRow.key}
    //         style={{
    //           position: "absolute",
    //           top: 0,
    //           left: 0,
    //           width: "100%",
    //           height: `${virtualRow.size}px`,
    //           transform: `translateY(${virtualRow.start}px)`,
    //         }}
    //       >
    //         {/* <EventCard
    //           className="my-2 h-[100px]"
    //           event={flatData[virtualRow.index]}
    //         /> */}
    //         <span className="line-clamp-1">
    //           {JSON.stringify(flatData[virtualRow.index])}
    //         </span>
    //       </div>
    //     ))}
    //   </div>
    // </ScrollArea>
  );
}
