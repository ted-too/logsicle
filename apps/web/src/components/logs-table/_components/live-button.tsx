"use client";

import * as React from "react";
import type { FetchPreviousPageOptions } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CirclePlay, CirclePause } from "lucide-react";
import { useDataTable } from "@/components/data-table/data-table-provider";
import { useHotKey } from "@/hooks/use-hot-key";
import { useNavigate, useParams, useSearch } from "@tanstack/react-router";

const REFRESH_INTERVAL = 4_000;

interface LiveButtonProps {
	type: "app" | "request";
	fetchPreviousPage?: (
		options?: FetchPreviousPageOptions | undefined,
	) => Promise<unknown>;
}

export function LiveButton({ type, fetchPreviousPage }: LiveButtonProps) {
	const { tail, timestamp, sort, ...rest } = useSearch({
		from:
			type === "app"
				? "/_authd/$orgSlug/$projSlug/_dashboard/app-logs"
				: "/_authd/$orgSlug/$projSlug/_dashboard/request-logs",
	});
	const params = useParams({
		from:
			type === "app"
				? "/_authd/$orgSlug/$projSlug/_dashboard/app-logs"
				: "/_authd/$orgSlug/$projSlug/_dashboard/request-logs",
	});
	const navigate = useNavigate();

	const setSearch = (search: Record<string, unknown>) => {
		navigate({
			to:
				type === "app"
					? "/$orgSlug/$projSlug/app-logs"
					: "/$orgSlug/$projSlug/request-logs",
			search: { ...rest, ...search },
			params,
		});
	};

	const { table } = useDataTable();
	useHotKey(handleClick, "j");

	React.useEffect(() => {
		let timeoutId: NodeJS.Timeout;

		async function fetchData() {
			if (tail) {
				await fetchPreviousPage?.();
				timeoutId = setTimeout(fetchData, REFRESH_INTERVAL);
			} else {
				clearTimeout(timeoutId);
			}
		}

		fetchData();

		return () => {
			clearTimeout(timeoutId);
		};
	}, [tail, fetchPreviousPage]);

	// REMINDER: make sure to reset live when date is set
	// TODO: test properly
	React.useEffect(() => {
		if ((timestamp || sort) && tail) {
			setSearch({ ...rest, tail: null });
		}
	}, [timestamp, sort]);

	function handleClick() {
		setSearch({
			live: !tail,
			date: null,
			sort: null,
		});
		table.getColumn("date")?.setFilterValue(undefined);
		table.resetSorting();
	}

	return (
		<Button
			className={cn(tail && "border-info text-info hover:text-info")}
			onClick={handleClick}
			variant="outline"
			size="sm"
		>
			{tail ? (
				<CirclePause className="mr-2 h-4 w-4" />
			) : (
				<CirclePlay className="mr-2 h-4 w-4" />
			)}
			Live
		</Button>
	);
}
