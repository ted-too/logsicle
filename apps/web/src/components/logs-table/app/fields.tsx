"use client";

import { cn } from "@/lib/utils";
import type {
	DataTableFilterField,
	Option,
	SheetField,
} from "@/components/data-table/types";
import { getLevelColor } from "@/lib/request/level";
import { format } from "date-fns";
import CopyToClipboardContainer from "@/components/custom/copy-to-clipboard-container";
import { LOG_LEVELS, type AppLog, type LogLevel } from "@repo/api";

// instead of filterFields, maybe just 'fields' with a filterDisabled prop?
// that way, we could have 'message' or 'headers' field with label and value as well as type!
export const filterFields = [
	{
		label: "Time Range",
		value: "timestamp",
		type: "timerange",
		defaultOpen: true,
		commandDisabled: true,
	},
	{
		label: "Level",
		value: "level",
		type: "checkbox",
		defaultOpen: true,
		options: LOG_LEVELS.map((level) => ({ label: level, value: level })),
		component: (props: Option) => {
			// TODO: type `Option` with `options` values via Generics
			const value = props.value as LogLevel;
			return (
				<div className="flex grow items-center gap-2 max-w-28 font-mono">
					<span className="capitalize min-w-16 text-foreground/70 group-hover:text-accent-foreground">
						{props.label}
					</span>
					<div className="flex items-center gap-2">
						<div
							className={cn(
								"h-2.5 w-2.5 rounded-[2px]",
								getLevelColor(value).bg,
							)}
						/>
						<span className="text-xs text-muted-foreground/70">{value}</span>
					</div>
				</div>
			);
		},
	},
	{
		label: "Host",
		value: "host",
		type: "input",
	},
	{
		label: "Service",
		value: "service_name",
		type: "input",
	},
	{
		label: "Caller",
		value: "caller",
		type: "input",
	},
	{
		label: "Function",
		value: "function",
		type: "input",
	},
] satisfies DataTableFilterField<AppLog>[];

export const sheetFields = [
	{
		id: "id",
		label: "Log ID",
		type: "readonly",
		skeletonClassName: "w-64",
	},
	{
		id: "timestamp",
		label: "Date",
		type: "timerange",
		component: (props) =>
			format(new Date(props.timestamp), "LLL dd, y HH:mm:ss"),
		skeletonClassName: "w-36",
	},
	{
		id: "level",
		label: "Level",
		type: "checkbox",
		component: (props) => {
			return (
				<span className={cn("font-mono", getLevelColor(props.level).text)}>
					{props.level}
				</span>
			);
		},
		skeletonClassName: "w-12",
	},
	{
		id: "fields",
		label: "Body",
		type: "readonly",
		component: (props) => {
			return <span className="font-mono">{JSON.stringify(props.fields)}</span>;
		},
		skeletonClassName: "w-10",
	},
	{
		id: "host",
		label: "Host",
		type: "input",
		skeletonClassName: "w-24",
	},
	{
		id: "caller",
		label: "Caller",
		type: "input",
		skeletonClassName: "w-10",
	},
	{
		id: "function",
		label: "Function",
		type: "input",
		skeletonClassName: "w-10",
	},
	{
		id: "version",
		label: "Version",
		type: "input",
		skeletonClassName: "w-10",
	},
	{
		id: "environment",
		label: "Environment",
		type: "input",
		skeletonClassName: "w-10",
	},
	{
		id: "message",
		label: "Message",
		type: "readonly",
		condition: (props) => props.message !== undefined,
		component: (props) => (
			<CopyToClipboardContainer className="rounded-md bg-destructive/30 border border-destructive/50 p-2 whitespace-pre-wrap break-all font-mono text-sm">
				{JSON.stringify(props.message, null, 2)}
			</CopyToClipboardContainer>
		),
		className: "flex-col items-start w-full gap-1",
	},
] satisfies SheetField<AppLog>[];
