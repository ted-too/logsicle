"use client";

import { RangeCalendar } from "@/components/ui/calendar-rac";
import { DateInput, dateInputStyle } from "@/components/ui/datefield-rac";
import {
	Popover,
	PopoverAnchor,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { projectsQueries } from "@/qc/legacy-queries/projects";
import {
	type ZonedDateTime,
	fromDate,
	getLocalTimeZone,
} from "@internationalized/date";
import { suggestInterval } from "@repo/api";
import { useNavigate, useParams, useRouterState } from "@tanstack/react-router";
import { debounce } from "@tanstack/react-virtual";
import { add, format, sub } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTransition } from "react";
import { Button, DateRangePicker, Dialog, Group } from "react-aria-components";
import { Label } from "../ui/label";
import { ScrollArea } from "../ui/scroll-area";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "../ui/select";

const HR_MM_TIMES = Array.from({ length: 96 }).map((_, i) => {
	const hour = Math.floor(i / 4)
		.toString()
		.padStart(2, "0");
	const minute = ((i % 4) * 15).toString().padStart(2, "0");
	return `${hour}:${minute}`;
});

export default function TimeRangePicker() {
	const params = useParams({ from: "/_authd/_app/dashboard/$projId/logs" });
	const { data: project } = projectsQueries.getById.useSuspenseQuery(
		params.projId,
	);
	const navigate = useNavigate();
	const [isPending, startTransition] = useTransition();
	const timezone = getLocalTimeZone();
	const prevSearch = useRouterState({
		select: (state) => state.location.search,
	});

	// Local state for immediate updates
	const [localRange, setLocalRange] = useState<{
		start: ZonedDateTime;
		end: ZonedDateTime;
	}>({
		start: fromDate(new Date(prevSearch.start!), timezone),
		end: fromDate(new Date(prevSearch.end!), timezone),
	});

	// Update local state when URL changes
	useEffect(() => {
		setLocalRange({
			start: fromDate(new Date(prevSearch.start!), timezone),
			end: fromDate(new Date(prevSearch.end!), timezone),
		});
	}, [prevSearch.start, prevSearch.end, timezone]);

	// Debounced navigation
	const debouncedNavigate = useMemo(
		() =>
			debounce(
				window,
				(value: { start: ZonedDateTime; end: ZonedDateTime }) => {
					startTransition(() => {
						const interval = suggestInterval(
							value.start.toDate(),
							value.end.toDate(),
						);
						navigate({
							to: "/dashboard/$projId/logs",
							params,
							search: {
								...prevSearch,
								interval,
								start: value.start.toDate(),
								end: value.end.toDate(),
							},
						});
					});
				},
				300,
			),
		[navigate, params, prevSearch],
	);

	useEffect(() => {
		return () => {
			window.clearTimeout(debouncedNavigate as unknown as number);
		};
	}, [debouncedNavigate]);

	function onChange(
		value: { start: ZonedDateTime; end: ZonedDateTime } | null,
	) {
		if (!value) return;

		// Update local state immediately
		setLocalRange(value);
		// Debounce the navigation
		debouncedNavigate(value);
	}

	const startCutoff = sub(new Date(), {
		days: project?.log_retention_days + 1,
	});
	const endCutoff = add(new Date(), { days: 1 });

	const START_TIMES = useMemo(() => {
		const filteredTimes = HR_MM_TIMES.filter((time) => {
			const [hours, minutes] = time.split(":");
			const hour = hours ? Number.parseInt(hours) : undefined;
			const minute = minutes ? Number.parseInt(minutes) : undefined;
			const newStart = localRange.start.set({ hour, minute });
			return newStart.toDate() >= startCutoff;
		});

		const currentStartTime = format(localRange.start.toDate(), "HH:mm");
		if (!filteredTimes.includes(currentStartTime)) {
			filteredTimes.push(currentStartTime);
			filteredTimes.sort(); // Keep the list sorted
		}

		return filteredTimes;
	}, [startCutoff, localRange.start]);

	const END_TIMES = useMemo(() => {
		const filteredTimes = HR_MM_TIMES.filter((time) => {
			const [hours, minutes] = time.split(":");
			const hour = hours ? Number.parseInt(hours) : undefined;
			const minute = minutes ? Number.parseInt(minutes) : undefined;
			const newEnd = localRange.end.set({ hour, minute });
			return newEnd.toDate() <= endCutoff;
		});

		const currentEndTime = format(localRange.end.toDate(), "HH:mm");
		if (!filteredTimes.includes(currentEndTime)) {
			filteredTimes.push(currentEndTime);
			filteredTimes.sort(); // Keep the list sorted
		}

		return filteredTimes;
	}, [endCutoff, localRange.end]);

	return (
		<Popover>
			<DateRangePicker
				value={localRange}
				className="space-y-0"
				onChange={onChange}
				isDateUnavailable={(date) =>
					date.toDate(timezone) < startCutoff ||
					date.toDate(timezone) > endCutoff
				}
				hourCycle={24}
			>
				<Label className="text-sm font-medium text-foreground sr-only">
					Time range picker
				</Label>
				<PopoverAnchor>
					<div className="flex font-mono">
						<Group className={cn(dateInputStyle, "pe-9")}>
							<DateInput slot="start" short unstyled />
							<span
								aria-hidden="true"
								className="px-2 text-muted-foreground/70"
							>
								-
							</span>
							<DateInput slot="end" timezone display="time" unstyled />
						</Group>
						<PopoverTrigger asChild>
							<Button className="z-10 -me-px -ms-9 flex w-9 items-center justify-center rounded-e-lg text-muted-foreground/80 outline-offset-2 transition-colors hover:text-foreground focus-visible:outline-none data-[focus-visible]:outline data-[focus-visible]:outline-2 data-[focus-visible]:outline-ring/70">
								<CalendarIcon size={16} strokeWidth={2} />
							</Button>
						</PopoverTrigger>
					</div>
				</PopoverAnchor>
				<PopoverContent
					className="z-50 w-max rounded-lg border p-0 border-border bg-background text-popover-foreground shadow-xs shadow-black/5 outline-none data-[entering]:animate-in data-[exiting]:animate-out data-[entering]:fade-in-0 data-[exiting]:fade-out-0 data-[entering]:zoom-in-95 data-[exiting]:zoom-out-95 data-[placement=bottom]:slide-in-from-top-2 data-[placement=left]:slide-in-from-right-2 data-[placement=right]:slide-in-from-left-2 data-[placement=top]:slide-in-from-bottom-2"
					align="center"
					// offset={4}
				>
					<Dialog className="max-h-[inherit] overflow-auto p-2 flex flex-col items-center gap-2">
						<RangeCalendar />
						<div className="flex items-center gap-2 px-2 pb-2 pt-1">
							<div className="flex flex-col grow gap-1">
								<Select
									value={format(localRange.start.toDate(), "HH:mm")}
									onValueChange={(value) => {
										const [hours, minutes] = value.split(":");
										const hour = hours ? Number.parseInt(hours) : undefined;
										const minute = minutes
											? Number.parseInt(minutes)
											: undefined;
										onChange({
											start: localRange.start.set({ hour, minute }),
											end: localRange.end,
										});
									}}
								>
									<SelectTrigger
										className="font-normal focus:ring-0 w-[120px] rounded-lg"
										id="start-time"
									>
										<div className="w-full flex items-center justify-between pr-2">
											<Label
												htmlFor="start-time"
												className="text-xs text-muted-foreground"
											>
												From
											</Label>
											<SelectValue />
										</div>
									</SelectTrigger>
									<SelectContent>
										<ScrollArea className="h-[15rem]">
											{START_TIMES.map((v) => (
												<SelectItem key={`start-${v}`} value={v}>
													{v}
												</SelectItem>
											))}
										</ScrollArea>
									</SelectContent>
								</Select>
							</div>
							<div className="flex flex-col grow gap-1">
								<Select
									value={format(localRange.end.toDate(), "HH:mm")}
									onValueChange={(value) => {
										const [hours, minutes] = value.split(":");
										const hour = hours ? Number.parseInt(hours) : undefined;
										const minute = minutes
											? Number.parseInt(minutes)
											: undefined;
										onChange({
											start: localRange.start,
											end: localRange.end.set({ hour, minute }),
										});
									}}
								>
									<SelectTrigger
										className="font-normal focus:ring-0 w-[120px] rounded-lg"
										id="end-time"
									>
										<div className="w-full flex items-center justify-between pr-2">
											<Label
												htmlFor="end-time"
												className="text-xs text-muted-foreground"
											>
												To
											</Label>
											<SelectValue />
										</div>
									</SelectTrigger>
									<SelectContent>
										<ScrollArea className="h-[15rem]">
											{END_TIMES.map((v) => (
												<SelectItem key={`end-${v}`} value={v}>
													{v}
												</SelectItem>
											))}
										</ScrollArea>
									</SelectContent>
								</Select>
							</div>
						</div>
					</Dialog>
				</PopoverContent>
			</DateRangePicker>
		</Popover>
	);
}
