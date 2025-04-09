import { ChannelSelector } from "@/components/events/channel-selector";
import { EventList } from "@/components/events/list";
import { EventsPageHeader } from "@/components/events/page-header";
import { listEventsSchema } from "@repo/api";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute(
	"/_authd/$orgSlug/$projSlug/_dashboard/events",
)({
	validateSearch: listEventsSchema,
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<div className="grid h-full grid-cols-[240px_1fr]">
			<aside className="border-r bg-background flex flex-col gap-3.5 p-2 pt-0">
				<ChannelSelector />
			</aside>
			<main className="flex flex-col px-1">
				<EventsPageHeader />
				<EventList />
			</main>
		</div>
	);
}
