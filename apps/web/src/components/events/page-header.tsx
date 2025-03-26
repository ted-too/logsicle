import { DeleteChannel } from "@/components/events/delete-channel";
import { EditChannel } from "@/components/events/edit-channel";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEvents } from "@/hooks/use-events";
import { getChannelsQueryOptions } from "@/qc/resources/events";
import { useQuery } from "@tanstack/react-query";
import {
	useNavigate,
	useParams,
	useRouteContext,
	useSearch,
} from "@tanstack/react-router";
import { debounce } from "@tanstack/react-virtual";
import { LoaderCircle, Search } from "lucide-react";
import {
	useCallback,
	useEffect,
	useMemo,
	useState,
	useTransition,
} from "react";

export function EventsPageHeader() {
	const { currentProject } = useRouteContext({
		from: "/_authd/$orgSlug/$projSlug/_dashboard/events",
	});
	const params = useParams({
		from: "/_authd/$orgSlug/$projSlug/_dashboard/events",
	});
	const searchParams = useSearch({
		from: "/_authd/$orgSlug/$projSlug/_dashboard/events",
	});
	const navigate = useNavigate();
	const [isPending, startTransition] = useTransition();
	const { totalCount, filteredCount, isFetching } = useEvents();

	// Local state for immediate updates
	const [localSearch, setLocalSearch] = useState(searchParams.search || "");

	const { data: channels, isPending: channelsPending } = useQuery(
		getChannelsQueryOptions(currentProject.id),
	);

	const selectedChannel = searchParams.channel_slug
		? channels?.find((c) => c.slug === searchParams.channel_slug)
		: undefined;

	// Update local state when URL changes
	useEffect(() => {
		setLocalSearch(searchParams.search || "");
	}, [searchParams.search]);

	const debouncedNavigate = useMemo(
		() =>
			debounce(
				window,
				(value: string) => {
					startTransition(() => {
						navigate({
							to: "/$orgSlug/$projSlug/events",
							params,
							search: { ...searchParams, search: value },
						});
					});
				},
				300,
			),
		[navigate, params, searchParams],
	);

	useEffect(() => {
		return () => {
			window.clearTimeout(debouncedNavigate as unknown as number);
		};
	}, [debouncedNavigate]);

	const handleSearchChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const value = e.target.value;
			setLocalSearch(value);
			debouncedNavigate(value);
		},
		[debouncedNavigate],
	);

	return (
		<div className="mb-1 flex flex-col px-3 pt-3.5 h-[70px]">
			<div className="flex items-center w-full justify-between">
				<div className="flex items-center gap-4">
					<h1 className="text-xl font-bold">
						{selectedChannel ? `${selectedChannel.name}` : "All Events"}
					</h1>
					{selectedChannel !== undefined && (
						<>
							<EditChannel channel={selectedChannel} />
							<DeleteChannel channel={selectedChannel} />
						</>
					)}
				</div>
				<div>
					<Label htmlFor="search-event" className="sr-only">
						Search for an event
					</Label>
					<div className="flex items-center gap-4">
						{localSearch && (
							<span className="text-xs text-muted-foreground">
								Showing {filteredCount} of {totalCount} events
							</span>
						)}
						<div className="relative">
							<Input
								id="search-event"
								className="peer pe-9 ps-9 rounded-lg bg-background"
								placeholder="Search..."
								type="search"
								value={localSearch}
								onChange={handleSearchChange}
							/>
							<div className="pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3 text-muted-foreground/80 peer-disabled:opacity-50">
								{localSearch && (isFetching || isPending) ? (
									<LoaderCircle
										className="animate-spin"
										size={14}
										strokeWidth={2}
										role="status"
										aria-label="Loading..."
									/>
								) : (
									<Search size={14} strokeWidth={2} aria-hidden="true" />
								)}
							</div>
						</div>
					</div>
				</div>
			</div>
			<p className="text-sm text-muted-foreground">
				{selectedChannel
					? (selectedChannel.description ?? "")
					: "Showing all events"}
			</p>
		</div>
	);
}
