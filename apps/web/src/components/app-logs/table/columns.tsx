import { cn } from "@/lib/utils";
import { AppLog } from "@repo/api";
import { Column, ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { FieldsCell } from "./fields-cell";
import { ColumnVisibility, RowActions } from "./row-actions";
import { CSSProperties } from "react";

export const getPinningStyles = (
  column: Column<AppLog>,
  isHeader = false
): CSSProperties => {
  const isPinned = column.getIsPinned();

  return {
    left: isPinned === "left" ? `${column.getStart("left")}px` : undefined,
    right: isPinned === "right" ? `${column.getAfter("right")}px` : undefined,
    position: isPinned ? "sticky" : "relative",
    width: `calc(var(--col-${column.id}-size) * 1px)`,
    minWidth: column.columnDef.meta?.minSize,
    zIndex: isPinned ? 2 : 0,
    flex: `0 0 calc(var(--col-${column.id}-size) * 1px)`,
    display: "flex",
    alignItems: "center",
    height: "100%",
    backgroundColor: isHeader ? "#FAFAFA" : undefined,
  };
};

export const columns: ColumnDef<AppLog>[] = [
  {
    header: "Timestamp",
    accessorKey: "timestamp",
    cell: ({ row }) => (
      <div
        className={cn(
          "truncate h-5 flex items-center font-medium relative before:absolute before:inset-0 before:content-[''] before:w-[3px] pl-3 before:h-full before:rounded-full",
          "app-log-timestamp"
        )}
        data-level={row.getValue("level")}
      >
        <span>
          {format(
            new Date(row.getValue("timestamp") as string),
            "MMM dd, HH:mm:ss.SSS"
          )}
        </span>
      </div>
    ),
    size: 196,
    meta: {
      minSize: 196,
    },
  },
  {
    header: "Service",
    accessorKey: "service_name",
    cell: ({ row }) => (
      <div className="truncate px-2 py-0.5 bg-neutral-50 w-max border-neutral-200 border rounded">
        {row.getValue("service_name")}
      </div>
    ),
    size: 148,
    meta: {
      minSize: 148,
    },
  },
  {
    header: "Severity",
    accessorKey: "level",
    cell: ({ row }) => (
      <div
        className={cn(
          "w-max px-1.5 py-0.5 rounded border uppercase text-[11px]",
          "app-log-level"
        )}
        data-level={row.getValue("level")}
      >
        {row.getValue("level")}
      </div>
    ),
    size: 128,
    meta: {
      minSize: 128,
    },
  },
  {
    header: "Msg",
    accessorKey: "message",
    cell: ({ row }) => (
      <div className="truncate">{row.getValue("message")}</div>
    ),
    size: 148,
    meta: {
      minSize: 148,
    },
  },
  {
    header: "Body",
    accessorKey: "fields",
    cell: FieldsCell,
    // size set dynamically
    meta: {
      minSize: 256,
    },
  },
  {
    header: "Caller",
    accessorKey: "caller",
    cell: ({ row }) => (
      <div className="truncate">{row.getValue("caller") || "-"}</div>
    ),
    size: 148,
    meta: {
      minSize: 148,
    },
  },
  {
    header: "Function",
    accessorKey: "function",
    cell: ({ row }) => (
      <div className="truncate">{row.getValue("function") || "-"}</div>
    ),
    size: 148,
    meta: {
      minSize: 148,
    },
  },
  {
    header: "Version",
    accessorKey: "version",
    cell: ({ row }) => (
      <div className="truncate">{row.getValue("version") || "-"}</div>
    ),
    size: 148,
    meta: {
      minSize: 148,
    },
  },
  {
    header: "Environment",
    accessorKey: "environment",
    cell: ({ row }) => (
      <div className="truncate">{row.getValue("environment") || "-"}</div>
    ),
    size: 148,
    meta: {
      minSize: 148,
    },
  },
  {
    header: "Host",
    accessorKey: "host",
    cell: ({ row }) => (
      <div className="truncate">{row.getValue("host") || "-"}</div>
    ),
    size: 148,
    meta: {
      minSize: 148,
    },
  },
  {
    id: "actions",
    header: ColumnVisibility,
    cell: RowActions,
    size: 60,
    enableHiding: false,
    enablePinning: false,
  },
];
