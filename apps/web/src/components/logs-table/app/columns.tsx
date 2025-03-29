"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Minus } from "lucide-react";
import { DataTableColumnHeader } from "@/components/data-table/column-header";
import { TextWithTooltip } from "@/components/custom/text-with-tooltip";
import { HoverCardTimestamp } from "../hover-card-timestamp";
import type { AppLog, LogLevel, RequestLevel } from "@repo/api";
import { LevelIndicator } from "../level-indicator";
import { getLevelColor } from "@/lib/request/level";

export const appLogColumns: ColumnDef<AppLog>[] = [
  {
    id: "level-label",
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
        "w-(--header-level-label-size) max-w-(--header-level-label-size) min-w-(--header-level-label-size)",
      cellClassName:
        "w-(--col-level-label-size) max-w-(--col-level-label-size) min-w-(--col-level-label-size)",
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
        "w-(--header-timestamp-size) max-w-(--header-timestamp-size) min-w-(--header-timestamp-size)",
      cellClassName:
        "font-mono w-(--col-timestamp-size) max-w-(--col-timestamp-size) min-w-(--col-timestamp-size)",
    },
  },
  {
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
        "font-mono w-(--col-id-size) max-w-(--col-id-size) min-w-(--col-id-size)",
      headerClassName:
        "min-w-(--header-id-size) w-(--header-id-size) max-w-(--header-id-size)",
    },
  },
  {
    id: "level",
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
        "w-(--header-level-size) max-w-(--header-level-size) min-w-(--header-level-size)",
      cellClassName:
        "font-mono w-(--col-level-size) max-w-(--col-level-size) min-w-(--col-level-size)",
    },
  },
  {
    accessorKey: "message",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Message" />
    ),
    cell: ({ row }) => {
      const value = row.getValue("message") as string;
      return <TextWithTooltip text={value} />;
    },
    filterFn: "includesString",
    enableSorting: false,
    size: 120,
    minSize: 120,
    meta: {
      cellClassName:
        "font-mono text-muted-foreground w-(--col-message-size) max-w-(--col-message-size) min-w-(--col-message-size)",
      headerClassName:
        "w-(--header-message-size) max-w-(--header-message-size) min-w-(--header-message-size)",
    },
  },
  {
    accessorKey: "fields",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Body" />
    ),
    cell: ({ row }) => JSON.stringify(row.getValue("fields")),
    filterFn: "includesString",
    enableSorting: false,
		enableResizing: true,
    size: 256,
    minSize: 256,
    meta: {
      cellClassName:
        "font-mono text-muted-foreground w-(--col-fields-size) max-w-(--col-fields-size) min-w-(--col-fields-size)",
      headerClassName:
        "w-(--header-fields-size) max-w-(--header-fields-size) min-w-(--header-fields-size)",
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
        "font-mono w-(--col-environment-size) max-w-(--col-environment-size)",
      headerClassName:
        "min-w-(--header-environment-size) w-(--header-environment-size)",
    },
  },
	{
		accessorKey: "function",
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title="Function" />
		),
		size: 69,
		minSize: 69,
    meta: {
      cellClassName:
        "font-mono w-(--col-function-size) max-w-(--col-function-size)",
      headerClassName:
        "w-(--header-function-size) max-w-(--header-function-size)",
    },
	},
	{
		accessorKey: "host",
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title="Host" />
		),
		size: 69,
		minSize: 69,
    meta: {
      cellClassName:
        "font-mono w-(--col-host-size) max-w-(--col-host-size)",
      headerClassName:
        "w-(--header-host-size) max-w-(--header-host-size)",
    },
	},
	{
		accessorKey: "service_name", 
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title="Service" />
		),
		size: 69,
		minSize: 69,
    meta: {
      cellClassName:
        "font-mono w-(--col-service-name-size) max-w-(--col-service-name-size)",
      headerClassName:
        "w-(--header-service-name-size) max-w-(--header-service-name-size)",
    },
	},
	{
		accessorKey: "caller",
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title="Caller" />
		),
		size: 69,
		minSize: 69,
    meta: {
      cellClassName:
        "font-mono w-(--col-caller-size) max-w-(--col-caller-size)",
      headerClassName:
        "w-(--header-caller-size) max-w-(--header-caller-size)",
    },
	},
	{
		accessorKey: "version",
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title="Version" />
		),
		size: 69,
		minSize: 69,
    meta: {
      cellClassName:
        "font-mono w-(--col-version-size) max-w-(--col-version-size)",
      headerClassName:
        "w-(--header-version-size) max-w-(--header-version-size)",
    },
	}
];
