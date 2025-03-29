"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Minus } from "lucide-react";
import { getStatusColor } from "@/lib/request/status-code";
import { DataTableColumnHeader } from "@/components/data-table/column-header";
import { TextWithTooltip } from "@/components/custom/text-with-tooltip";
import { HoverCardTimestamp } from "../hover-card-timestamp";
import type { RequestLevel, RequestLog } from "@repo/api";
import { LevelIndicator } from "../level-indicator";

export const requestLogColumns: ColumnDef<RequestLog>[] = [
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
			<DataTableColumnHeader column={column} title="Date" />
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
				"w-[--header-date-size] max-w-[--header-date-size] min-w-[--header-date-size]",
			cellClassName:
				"font-mono w-[--col-date-size] max-w-[--col-date-size] min-w-[--col-date-size]",
		},
	},
	{
		id: "id",
		accessorKey: "id",
		header: "Request Id",
		cell: ({ row }) => {
			const value = row.getValue("id") as string;
			return <TextWithTooltip text={value} />;
		},
		size: 130,
		minSize: 130,
		meta: {
			label: "Request Id",
			cellClassName:
				"font-mono w-[--col-uuid-size] max-w-[--col-uuid-size] min-w-[--col-uuid-size]",
			headerClassName:
				"min-w-[--header-uuid-size] w-[--header-uuid-size] max-w-[--header-uuid-size]",
		},
	},
	{
		accessorKey: "status_code",
		header: "Status",
		cell: ({ row }) => {
			const value = row.getValue("status_code");
			if (typeof value === "undefined") {
				return <Minus className="h-4 w-4 text-muted-foreground/50" />;
			}
			if (typeof value === "number") {
				const colors = getStatusColor(value);
				return <div className={`${colors.text} font-mono`}>{value}</div>;
			}
			return <div className="text-muted-foreground">{`${value}`}</div>;
		},
		filterFn: "arrSome",
		enableResizing: false,
		size: 60,
		minSize: 60,
		meta: {
			headerClassName:
				"w-[--header-status-size] max-w-[--header-status-size] min-w-[--header-status-size]",
			cellClassName:
				"font-mono w-[--col-status-size] max-w-[--col-status-size] min-w-[--col-status-size]",
		},
	},
	{
		accessorKey: "method",
		header: "Method",
		filterFn: "arrIncludesSome",
		enableResizing: false,
		size: 69,
		minSize: 69,
		meta: {
			cellClassName:
				"font-mono text-muted-foreground w-[--col-method-size] max-w-[--col-method-size] min-w-[--col-method-size]",
			headerClassName:
				"w-[--header-method-size] max-w-[--header-method-size] min-w-[--header-method-size]",
		},
	},
	{
		accessorKey: "host",
		header: "Host",
		cell: ({ row }) => {
			const value = row.getValue("host") as string;
			if (!value) return <Minus className="h-4 w-4 text-muted-foreground/50" />;
			return <TextWithTooltip text={value} />;
		},
		size: 125,
		minSize: 125,
		meta: {
			cellClassName: "font-mono w-[--col-host-size] max-w-[--col-host-size]",
			headerClassName: "min-w-[--header-host-size] w-[--header-host-size]",
		},
	},
	{
		accessorKey: "path",
		header: "Path",
		cell: ({ row }) => {
			const value = row.getValue("path") as string;
			return <TextWithTooltip text={value} />;
		},
		size: 130,
		minSize: 130,
		meta: {
			cellClassName:
				"font-mono w-[--col-pathname-size] max-w-[--col-pathname-size]",
			headerClassName:
				"min-w-[--header-pathname-size] w-[--header-pathname-size]",
		},
	},
	{
		accessorKey: "duration",
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title="Duration" />
		),
		cell: ({ row }) => {
			const value = row.getValue("duration") as number;
			return <LatencyDisplay value={value} />;
		},
		filterFn: "inNumberRange",
		enableResizing: false,
		size: 110,
		minSize: 110,
		meta: {
			headerClassName:
				"w-[--header-latency-size] max-w-[--header-latency-size] min-w-[--header-latency-size]",
			cellClassName:
				"font-mono w-[--col-latency-size] max-w-[--col-latency-size] min-w-[--col-latency-size]",
		},
	},
	{
		accessorKey: "error",
		header: "Error",
		cell: ({ row }) => {
			const value = row.getValue("error") as string | null;
			if (!value) return <Minus className="h-4 w-4 text-muted-foreground/50" />;
			return <TextWithTooltip text={value} className="text-destructive" />;
		},
		size: 130,
		minSize: 130,
		meta: {
			cellClassName: "font-mono w-[--col-error-size] max-w-[--col-error-size]",
			headerClassName: "min-w-[--header-error-size] w-[--header-error-size]",
		},
	},
];

function LatencyDisplay({ value }: { value: number }) {
	return (
		<div className="font-mono">
			{new Intl.NumberFormat("en-US", { maximumFractionDigits: 3 }).format(
				value,
			)}
			<span className="text-muted-foreground">ms</span>
		</div>
	);
}
