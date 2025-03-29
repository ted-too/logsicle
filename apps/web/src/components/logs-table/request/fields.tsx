"use client";

import { cn } from "@/lib/utils";
import type {
	DataTableFilterField,
	Option,
	SheetField,
} from "@/components/data-table/types";
import { getStatusColor } from "@/lib/request/status-code";
import { METHODS } from "@/constants/method";
import { getLevelColor, getRequestLevelLabel } from "@/lib/request/level";
import { format } from "date-fns";
import { formatMilliseconds } from "@/lib/format";
import { TabsObjectView } from "../tabs-object-view";
import CopyToClipboardContainer from "@/components/copy-to-clipboard-container";
import type { RequestLog, RequestLevel } from "@repo/api";

// Define our request levels constant
const LEVELS: RequestLevel[] = ["success", "warning", "error", "info"];

// Type for logs meta
export type LogsMeta = {
	currentPercentiles?: Record<string, number>;
	filterRows?: number;
};

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
		options: LEVELS.map((level) => ({ label: level, value: level })),
		component: (props: Option) => {
			// TODO: type `Option` with `options` values via Generics
			// TODO: make this a component
			const value = props.value as RequestLevel;
			return (
				<div className="flex items-center justify-between gap-2 w-max font-mono">
					<span className="capitalize text-foreground/70 w-16 group-hover:text-accent-foreground">
						{props.label}
					</span>
					<div className="flex items-center gap-2">
						<div
							className={cn(
								"h-2.5 w-2.5 rounded-[2px]",
								getLevelColor(value).bg,
							)}
						/>
						<span className="text-xs text-muted-foreground/70">
							{getRequestLevelLabel(value)}
						</span>
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
		label: "Path",
		value: "path",
		type: "input",
	},
	{
		label: "Status Code",
		value: "status_code",
		type: "slider",
		min: 100,
		max: 599,
		unit: "",
		hideMetaLabel: true,
	},
	{
		label: "Method",
		value: "method",
		type: "checkbox",
		options: METHODS.map((method) => ({ label: method, value: method })),
		component: (props: Option) => {
			return <span className="font-mono">{props.value}</span>;
		},
	},
] satisfies DataTableFilterField<RequestLog>[];

export const sheetFields = [
	{
		id: "id",
		label: "Request ID",
		type: "readonly",
		skeletonClassName: "w-64",
	},
	{
		id: "timestamp",
		label: "Date",
		type: "timerange",
		component: (props) => format(new Date(props.timestamp), "LLL dd, y HH:mm:ss"),
		skeletonClassName: "w-36",
	},
	{
		id: "status_code",
		label: "Status",
		type: "checkbox",
		component: (props) => {
			return (
				<span className={cn("font-mono", getStatusColor(props.status_code).text)}>
					{props.status_code}
				</span>
			);
		},
		skeletonClassName: "w-12",
	},
	{
		id: "method",
		label: "Method",
		type: "checkbox",
		component: (props) => {
			return <span className="font-mono">{props.method}</span>;
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
		id: "path",
		label: "Path",
		type: "input",
		skeletonClassName: "w-56",
	},
	{
		id: "duration",
		label: "Duration",
		type: "slider",
		component: (props) => (
			<>
				{formatMilliseconds(props.duration)}
				<span className="text-muted-foreground">ms</span>
			</>
		),
		skeletonClassName: "w-16",
	},
	{
		id: "headers",
		label: "Headers",
		type: "readonly",
		component: (props) => {
			if (!props.headers) return null;
			return (
				// REMINDER: negative margin to make it look like the header is on the same level of the tab triggers
				<TabsObjectView data={props.headers} className="-mt-[22px]" />
			);
		},
		className: "flex-col items-start w-full gap-1",
	},
	{
		id: "request_body",
		label: "Request Body",
		type: "readonly",
		condition: (props) => !!props.request_body,
		component: (props) => {
			if (!props.request_body) return null;
			return (
				<CopyToClipboardContainer className="rounded-md bg-secondary/50 border border-border p-2 whitespace-pre-wrap break-all font-mono text-sm">
					{JSON.stringify(props.request_body, null, 2)}
				</CopyToClipboardContainer>
			);
		},
		className: "flex-col items-start w-full gap-1",
	},
	{
		id: "response_body",
		label: "Response Body",
		type: "readonly",
		condition: (props) => !!props.response_body,
		component: (props) => {
			if (!props.response_body) return null;
			return (
				<CopyToClipboardContainer className="rounded-md bg-secondary/50 border border-border p-2 whitespace-pre-wrap break-all font-mono text-sm">
					{JSON.stringify(props.response_body, null, 2)}
				</CopyToClipboardContainer>
			);
		},
		className: "flex-col items-start w-full gap-1",
	},
	{
		id: "query_params",
		label: "Query Parameters",
		type: "readonly",
		condition: (props) => !!props.query_params,
		component: (props) => {
			if (!props.query_params) return null;
			return (
				<TabsObjectView data={props.query_params} className="-mt-[22px]" />
			);
		},
		className: "flex-col items-start w-full gap-1",
	},
	{
		id: "error",
		label: "Error",
		type: "readonly",
		condition: (props) => !!props.error,
		component: (props) => {
			if (!props.error) return null;
			return (
				<CopyToClipboardContainer className="rounded-md bg-destructive/30 border border-destructive/50 p-2 whitespace-pre-wrap break-all font-mono text-sm">
					{props.error}
				</CopyToClipboardContainer>
			);
		},
		className: "flex-col items-start w-full gap-1",
	},
] satisfies SheetField<RequestLog, LogsMeta>[];

