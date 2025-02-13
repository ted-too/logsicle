import { cn } from "@/lib/utils";
import { AppLog } from "@repo/api";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { BodyCell } from "./body-cell";
import { ColumnVisibility, RowActions } from "./row-actions";

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
    size: 90,
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
    size: 48,
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
    // meta: {
    //   minSize: "fit-content" as unknown as number,
    // },
  },
  {
    header: "Msg",
    accessorKey: "message",
    cell: ({ row }) => (
      <div className="truncate">{row.getValue("message")}</div>
    ),
    size: 48,
    meta: {
      minSize: 148,
    },
  },
  {
    header: "Body",
    accessorKey: "fields",
    cell: BodyCell,
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
    size: 48,
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
    size: 48,
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
    size: 48,
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
    size: 48,
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
    size: 48,
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
