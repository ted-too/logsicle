"use client";

import { eachHourOfInterval, format, formatISO, parseISO } from "date-fns";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  AppLogMetric,
  eachIntervalOfRange,
  GetAppLogsParams,
  ValidInterval,
} from "@repo/api";
import { memo, useMemo } from "react";
import { useParams, useRouterState } from "@tanstack/react-router";
import { appLogsQueries } from "@/qc/queries/app-logs";

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
  const search = useRouterState({
    select: (state) => state.location.search,
  }) as GetAppLogsParams & {
    tail: boolean | undefined;
    interval: ValidInterval;
  };
  const params = useParams({ from: "/_authd/_app/dashboard/$projId/logs" });
  const { data: metrics } = appLogsQueries.metrics.useSuspenseQuery(
    params.projId,
    {
      ...{ ...search, tail: undefined },
    }
  );
  const allIntervals = useMemo(() => {
    return eachIntervalOfRange(search.start, search.end, search.interval);
  }, [search.start, search.end, search.interval]);

  const metricMap = useMemo(
    () => new Map(metrics.map((m) => [m.timestamp, m.counts])),
    [metrics]
  );

  const chartData = useMemo(() => {
    return allIntervals.map((hour) => {
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
      ...chartData.map(({ timestamp: _, ...d }) =>
        Object.values(d).reduce((a, b) => a + b, 0)
      )
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
