"use client";

import { format, formatISO, parseISO } from "date-fns";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@/components/ui/chart";
import { useQuery } from "@tanstack/react-query";
import { getAppMetricsQueryOptions } from "@/qc/resources/app";
import { useParams, useRouteContext, useSearch } from "@tanstack/react-router";
import { useMemo } from "react";
import { eachIntervalOfRange } from "@repo/api";

interface LogCounts {
	debug: number;
	info: number;
	warning: number;
	error: number;
	fatal: number;
}

const chartConfig = {
	fatal: {
		label: "Fatal",
		color: "var(--color-primary)", // A deep red
	},
	error: {
		label: "Error",
		color: "hsl(340, 70%, 50%)", // A vibrant pink
	},
	warning: {
		label: "Warning",
		color: "hsl(40, 90%, 50%)", // A bright yellow
	},
	info: {
		label: "Info",
		color: "hsl(150, 60%, 40%)", // A muted green
	},
	debug: {
		label: "Debug",
		color: "hsl(200, 70%, 50%)", // A bright blue
	},
};

const MAX_BAR_SIZE = 32;
const MIN_BAR_SIZE = 2;

const formatTick = (timestamp: string, full = false) =>
	full
		? format(parseISO(timestamp), "MMM d, HH:mm:ss")
		: format(parseISO(timestamp), "HH:mm:ss");

const formatYAxisValue = (value: number): string => {
	if (value >= 1000000) {
		return `${(value / 1000000).toFixed(1)}M`;
	}
	if (value >= 1000) {
		return `${(value / 1000).toFixed(1)}k`;
	}
	return value.toString();
};

export function LogVolumeChart() {
	const search = useSearch({
		from: "/_authd/$orgSlug/$projSlug/_dashboard/app-logs",
	});
	const params = useParams({
		from: "/_authd/$orgSlug/$projSlug/_dashboard/app-logs",
	});
	const { currentProject } = useRouteContext({
		from: "/_authd/$orgSlug/$projSlug/_dashboard/app-logs",
	});

	const { data } = useQuery(
		getAppMetricsQueryOptions(currentProject.id, {
			start:
				typeof search.start === "string"
					? Number.parseInt(search.start, 10)
					: search.start,
			end:
				typeof search.end === "string"
					? Number.parseInt(search.end, 10)
					: search.end,
			level: search.level,
			service_name: search.service_name,
			environment: search.environment,
			interval: search.interval,
		}),
	);

	const metrics = data?.by_time ?? [];

	const allIntervals = useMemo(() => {
		return eachIntervalOfRange(
			search.start,
			search.end,
			search.interval || "1h",
		);
	}, [search.start, search.end, search.interval]);

	// Transform the new metric data format to match our chart requirements
	const metricMap = useMemo(() => {
		const map = new Map<string, LogCounts>();

		// Group log counts by level
		const logsByLevel = new Map<string, number>();

		if (data?.by_level) {
			for (const item of data.by_level) {
				logsByLevel.set(item.level, item.count);
			}
		}

		// Create time-based data points with counts by level
		for (const point of metrics) {
			const timestamp = formatISO(new Date(point.timestamp * 1000));
			map.set(timestamp, {
				debug: logsByLevel.get("debug") || 0,
				info: logsByLevel.get("info") || 0,
				warning: logsByLevel.get("warn") || 0,
				error: logsByLevel.get("error") || 0,
				fatal: 0, // Not included in the API response
			});
		}

		return map;
	}, [data, metrics]);

	const chartData = useMemo(() => {
		return allIntervals.map((hour: Date) => {
			const timestamp = formatISO(hour);
			return {
				timestamp,
				...(metricMap.get(timestamp) || {
					debug: 0,
					error: 0,
					fatal: 0,
					info: 0,
					warning: 0,
				}),
			};
		});
	}, [allIntervals, metricMap]);

	const yTicks = useMemo(() => {
		// Calculate the maximum sum of all values for each timestamp
		const maxSum = Math.max(
			...chartData.map(({ timestamp: _, ...levels }) => {
				const values = Object.values(levels) as number[];
				return values.reduce((a, b) => a + b, 0);
			}),
		);

		// Add 20% padding to the max value
		const paddedMax = maxSum * 1.125;

		// Round up to the nearest 10
		const roundedMax = Math.ceil(paddedMax / 10) * 10;

		// Create three evenly spaced ticks
		return [Math.round(roundedMax / 2), roundedMax];
	}, [chartData]);

	return (
		<Card className="w-full h-[var(--chart-height)] rounded-lg relative shadow-xs p-0 z-20">
			<CardHeader className="p-0 absolute top-3 left-3">
				<CardTitle className="text-[10px] font-mono text-muted-foreground leading-none">
					Volume
				</CardTitle>
			</CardHeader>
			<CardContent className="h-[var(--chart-height)] p-3 pt-[1.325rem]">
				<ChartContainer config={chartConfig} className="w-full h-full">
					<BarChart
						data={chartData}
						stackOffset="none"
						margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
						height={100} // Explicit height to ensure proper rendering within 8rem container
					>
						<CartesianGrid
							vertical={false}
							horizontalPoints={yTicks}
							strokeDasharray="3 3"
						/>
						<XAxis
							dataKey="timestamp"
							tickLine={false}
							axisLine={false}
							tickFormatter={(value, i) => formatTick(value, i === 0)}
							interval="equidistantPreserveStart"
							minTickGap={10}
							height={24}
							tickMargin={10}
							style={{
								fontSize: "0.675rem",
								textTransform: "uppercase",
							}}
						/>
						<YAxis
							tickLine={false}
							axisLine={false}
							tickFormatter={formatYAxisValue}
							tickMargin={10}
							ticks={yTicks}
							width={24}
							style={{
								fontSize: "0.675rem",
							}}
						/>
						<ChartTooltip
							content={
								<ChartTooltipContent
									// formatter={(value) => `${value} logs`}
									labelFormatter={(label) =>
										format(parseISO(label), "MMM d, HH:mm:ss")
									}
								/>
							}
						/>
						{/* <ChartLegend content={<ChartLegendContent />} /> */}
						<Bar
							dataKey="debug"
							stackId="a"
							fill="var(--color-debug)"
							radius={[0, 0, 0, 0]}
							maxBarSize={MAX_BAR_SIZE}
							min={MIN_BAR_SIZE}
						/>
						<Bar
							dataKey="info"
							stackId="a"
							fill="var(--color-info)"
							radius={[0, 0, 0, 0]}
							maxBarSize={MAX_BAR_SIZE}
							min={MIN_BAR_SIZE}
						/>
						<Bar
							dataKey="warning"
							stackId="a"
							fill="var(--color-warning)"
							radius={[0, 0, 0, 0]}
							maxBarSize={MAX_BAR_SIZE}
							min={MIN_BAR_SIZE}
						/>
						<Bar
							dataKey="error"
							stackId="a"
							fill="var(--color-error)"
							radius={[0, 0, 0, 0]}
							maxBarSize={MAX_BAR_SIZE}
							min={MIN_BAR_SIZE}
						/>
						<Bar
							dataKey="fatal"
							stackId="a"
							fill="var(--color-fatal)"
							radius={[2, 2, 0, 0]}
							maxBarSize={MAX_BAR_SIZE}
							min={MIN_BAR_SIZE}
						/>
					</BarChart>
				</ChartContainer>
			</CardContent>
		</Card>
	);
}
