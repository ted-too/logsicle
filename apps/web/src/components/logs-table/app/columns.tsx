"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Minus } from "lucide-react";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { TextWithTooltip } from "@/components/custom/text-with-tooltip";
import { HoverCardTimestamp } from "../_components/hover-card-timestamp";
import type { AppLog, LogLevel, RequestLevel } from "@repo/api";
import { LevelIndicator } from "../_components/level-indicator";
import { getLevelColor } from "@/lib/request/level";

export const appLogColumns: ColumnDef<AppLog>[] = [
  {
    accessorKey: "level",
    header: "",
    cell: ({ row }) => {
      const value = row.getValue("level") as RequestLevel;
      return <LevelIndicator level={value} />;
    },
    enableHiding: false,
    enableResizing: false,
    filterFn: "arrSome",
    size: 27,
    minSize: 27,
    maxSize: 27,
    meta: {
      headerClassName:
        "w-[--header-level-size] max-w-[--header-level-size] min-w-[--header-level-size]",
      cellClassName:
        "w-[--col-level-size] max-w-[--col-level-size] min-w-[--col-level-size]",
    },
  },
  {
    accessorKey: "timestamp",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Timestamp" />
    ),
    cell: ({ row }) => {
      const date = new Date(row.getValue("timestamp"));
      return <HoverCardTimestamp date={date} />;
    },
    filterFn: "inDateRange",
    enableResizing: false,
    size: 200,
    minSize: 200,
    meta: {
      headerClassName:
        "w-[--header-timestamp-size] max-w-[--header-timestamp-size] min-w-[--header-timestamp-size]",
      cellClassName:
        "font-mono w-[--col-timestamp-size] max-w-[--col-timestamp-size] min-w-[--col-timestamp-size]",
    },
  },
  {
    id: "id",
    accessorKey: "id",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Log Id" />
    ),
    cell: ({ row }) => {
      const value = row.getValue("id") as string;
      return <TextWithTooltip text={value} />;
    },
    size: 130,
    minSize: 130,
    enableSorting: false,
    meta: {
      label: "Log Id",
      cellClassName:
        "font-mono w-[--col-id-size] max-w-[--col-id-size] min-w-[--col-id-size]",
      headerClassName:
        "min-w-[--header-id-size] w-[--header-id-size] max-w-[--header-id-size]",
    },
  },
  {
    id: "log_level",
    accessorKey: "level",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Level" />
    ),
    cell: ({ row }) => {
      const value = row.getValue("level") as undefined | LogLevel;
      if (value === undefined) {
        return <Minus className="h-4 w-4 text-muted-foreground/50" />;
      }
      const colors = getLevelColor(value);
      return <span className={`${colors.text} font-mono`}>{value}</span>;
    },
    filterFn: "arrSome",
    enableResizing: false,
    size: 60,
    minSize: 60,
    meta: {
      headerClassName:
        "w-[--header-log_level-size] max-w-[--header-log_level-size] min-w-[--header-log_level-size]",
      cellClassName:
        "font-mono w-[--col-log_level-size] max-w-[--col-log_level-size] min-w-[--col-log_level-size]",
    },
  },
  {
    accessorKey: "message",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Message" />
    ),
    filterFn: "includesString",
    enableSorting: false,
    size: 69,
    minSize: 69,
    meta: {
      cellClassName:
        "font-mono text-muted-foreground w-[--col-message-size] max-w-[--col-message-size] min-w-[--col-message-size]",
      headerClassName:
        "w-[--header-message-size] max-w-[--header-message-size] min-w-[--header-message-size]",
    },
  },
  {
    accessorKey: "fields",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Body" />
    ),
    cell: ({ row }) => {
      const value = row.getValue("fields") as string;
      return <span className="truncate font-mono">{value}</span>;
    },
    filterFn: "includesString",
    enableSorting: false,
		enableResizing: true,
    size: 256,
    minSize: 256,
    meta: {
      cellClassName:
        "font-mono text-muted-foreground w-[--col-fields-size] max-w-[--col-fields-size] min-w-[--col-fields-size]",
      headerClassName:
        "w-[--header-fields-size] max-w-[--header-fields-size] min-w-[--header-fields-size]",
    },
  },
  {
    accessorKey: "environment",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Environment" />
    ),
    enableSorting: true,
    size: 69,
    minSize: 69,
    meta: {
      cellClassName:
        "font-mono w-[--col-environment-size] max-w-[--col-environment-size]",
      headerClassName:
        "min-w-[--header-environment-size] w-[--header-environment-size]",
    },
  },
];
