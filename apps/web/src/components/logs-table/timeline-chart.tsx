"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouteContext, useSearch } from "@tanstack/react-router";
import { format } from "date-fns";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ReferenceArea, XAxis } from "recharts";
import type { CategoricalChartFunc } from "recharts/types/chart/generateCategoricalChart";

import { useDataTable } from "@/components/data-table/provider";
import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";
import { getAppTimelineChartQueryOptions } from "@/qc/resources/app";
import { getRequestTimelineChartQueryOptions } from "@/qc/resources/request";
import type {
	AppLogTimelineChart,
	GetAppMetricsRequest,
	GetRequestMetricsRequest,
	RequestLogTimelineChart,
} from "@repo/api";
import { Skeleton } from "../ui/skeleton";

// Time constants in milliseconds
const ONE_MINUTE = 60 * 1000;
const ONE_HOUR = 60 * ONE_MINUTE;
const ONE_DAY = 24 * ONE_HOUR;
const ONE_WEEK = 7 * ONE_DAY;

// Log level colors
const LOG_LEVEL_VAR_PREFIX = "--chart";

const chartConfig = {
	success: {
		label: "Success",
		color: `var(${LOG_LEVEL_VAR_PREFIX}-success)`,
	},
	warning: {
		label: "Warning",
		color: `var(${LOG_LEVEL_VAR_PREFIX}-warning)`,
	},
	error: {
		label: "Error",
		color: `var(${LOG_LEVEL_VAR_PREFIX}-error)`,
	},
	debug: {
		label: "Debug",
		color: `var(${LOG_LEVEL_VAR_PREFIX}-debug)`,
	},
	info: {
		label: "Info",
		color: `var(${LOG_LEVEL_VAR_PREFIX}-info)`,
	},
	fatal: {
		label: "Fatal",
		color: `var(${LOG_LEVEL_VAR_PREFIX}-fatal)`,
	},
} satisfies ChartConfig;

interface TimelineChartProps {
	type: "app" | "request";
	className?: string;
	/**
	 * The table column id to filter by - needs to be a type of `timerange` (e.g. "timestamp").
	 */
	columnId: string;
}

/**
 * Formats a date based on the given time interval
 */
function formatDateByInterval(date: Date, interval: number): string {
	if (Number.isNaN(date.getTime())) return "N/A";

	if (interval <= 10 * ONE_MINUTE) {
		return format(date, "HH:mm:ss");
	}
	if (interval <= ONE_DAY) {
		return format(date, "HH:mm");
	}
	if (interval <= ONE_WEEK) {
		return format(date, "LLL dd HH:mm");
	}
	return format(date, "LLL dd, y");
}

/**
 * Formats a date for tooltip display
 */
function formatTooltipDate(value: string): string {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "N/A";
	return format(date, "LLL dd, y HH:mm");
}

/**
 * TimelineChart displays a stacked bar chart of log events over time.
 * It supports interactive selection of time ranges by clicking and dragging.
 * The chart displays different log levels (success, warning, error, etc.) with appropriate colors.
 *
 * @param type - The type of logs to display: "app" or "request"
 * @param className - Optional additional CSS classes
 * @param columnId - The table column id to filter by (must be a timerange type)
 */
export function TimelineChart({
	type,
	className,
	columnId,
}: TimelineChartProps) {
	const { table } = useDataTable();
	const [refAreaLeft, setRefAreaLeft] = useState<string | null>(null);
	const [refAreaRight, setRefAreaRight] = useState<string | null>(null);
	const [isSelecting, setIsSelecting] = useState(false);

	const { currentProject } = useRouteContext({
		from: "/_authd/$orgSlug/$projSlug/_dashboard",
	});

	const routePath = useMemo(
		() =>
			type === "app"
				? "/_authd/$orgSlug/$projSlug/_dashboard/app-logs"
				: "/_authd/$orgSlug/$projSlug/_dashboard/request-logs",
		[type],
	);

	const { tail: _, ...searchParams } = useSearch({ from: routePath });

	const queryOptions = useMemo(
		() =>
			type === "app"
				? getAppTimelineChartQueryOptions(
						currentProject.id,
						searchParams as GetAppMetricsRequest,
					)
				: getRequestTimelineChartQueryOptions(
						currentProject.id,
						searchParams as GetRequestMetricsRequest,
					),
		[type, currentProject.id, searchParams],
	);

	const { data: rawData, isLoading } = useQuery<unknown>(
		// @ts-expect-error - types are not automatically merged
		queryOptions,
	);

	// Type guard to ensure data is of the correct type
	const data = useMemo(
		() => (rawData ?? []) as AppLogTimelineChart | RequestLogTimelineChart,
		[rawData],
	);

	// Map timestamps to string dates for the chart
	const chart = useMemo(
		() =>
			data.map((item) => ({
				...item,
				[columnId]: new Date(item.timestamp).toString(),
			})),
		[data, columnId],
	);

	// Calculate time difference between the first and last timestamp
	const interval = useMemo(() => {
		if (!data || data.length <= 1) return 0;
		return Math.abs(data[0].timestamp - data[data.length - 1].timestamp);
	}, [data]);

	const handleMouseDown: CategoricalChartFunc = (e) => {
		if (e.activeLabel) {
			setRefAreaLeft(e.activeLabel);
			setIsSelecting(true);
		}
	};

	const handleMouseMove: CategoricalChartFunc = (e) => {
		if (isSelecting && e.activeLabel) {
			setRefAreaRight(e.activeLabel);
		}
	};

	const handleMouseUp: CategoricalChartFunc = (e) => {
		if (refAreaLeft && refAreaRight) {
			const [left, right] = [refAreaLeft, refAreaRight].sort(
				(a, b) => new Date(a).getTime() - new Date(b).getTime(),
			);
			table
				.getColumn(columnId)
				?.setFilterValue([new Date(left), new Date(right)]);
		}
		setRefAreaLeft(null);
		setRefAreaRight(null);
		setIsSelecting(false);
	};

	return (
		<ChartContainer
			config={chartConfig}
			className={cn(
				"aspect-auto h-[80px] w-full",
				"[&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted/50",
				"select-none",
				className,
			)}
		>
			{isLoading ? (
				<Skeleton className="h-full w-full" />
			) : data.length === 0 ? (
				<div className="flex h-full items-center justify-center">
					<p className="text-sm text-muted-foreground">No data available</p>
				</div>
			) : (
				<BarChart
					accessibilityLayer
					data={chart}
					margin={{ top: 0, left: 0, right: 0, bottom: 0 }}
					onMouseDown={handleMouseDown}
					onMouseMove={handleMouseMove}
					onMouseUp={handleMouseUp}
					onMouseLeave={handleMouseUp}
					style={{ cursor: "crosshair" }}
				>
					<CartesianGrid vertical={false} />
					<XAxis
						dataKey={columnId}
						tickLine={false}
						minTickGap={32}
						axisLine={false}
						tickFormatter={(value) => {
							const date = new Date(value);
							return formatDateByInterval(date, interval);
						}}
					/>
					<ChartTooltip
						cursor={false}
						content={
							<ChartTooltipContent
								indicator="dot"
								labelFormatter={formatTooltipDate}
							/>
						}
					/>
					{Object.keys(chartConfig).map((level) => (
						<Bar
							key={level}
							dataKey={level}
							// stackId="a"
							radius={4}
							fill={chartConfig[level as keyof typeof chartConfig].color}
						/>
					))}
					{refAreaLeft && refAreaRight && (
						<ReferenceArea
							x1={refAreaLeft}
							x2={refAreaRight}
							strokeOpacity={0.3}
							fill="hsl(var(--foreground))"
							fillOpacity={0.08}
						/>
					)}
				</BarChart>
			)}
		</ChartContainer>
	);
}
