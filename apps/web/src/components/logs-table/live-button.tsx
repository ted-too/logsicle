import { useDataTable } from "@/components/data-table/provider";
import { Button } from "@/components/ui/button";
import { useHotKey } from "@/hooks/use-hot-key";
import { cn } from "@/lib/utils";
import { CirclePause, CirclePlay } from "lucide-react";
import { useTableSearchParams } from "../../hooks/use-table-search-params";

interface LiveButtonProps {
	type: "app" | "request";
}

export function LiveButton({ type }: LiveButtonProps) {
	const { search, setSearch } = useTableSearchParams({ type });

	const { table } = useDataTable();
	useHotKey(handleClick, "j");

	function handleClick() {
		// Toggle tail mode and reset other search parameters
		const nextTail = !search.tail;

		// If we're turning on tail mode and there's a sort parameter, reset it
		if (nextTail) {
			// Reset any active timestamp filters or sorting in the table
			table.getColumn("timestamp")?.setFilterValue(undefined);
			table.resetSorting();
		}

		setSearch({
			tail: nextTail,
		});
	}

	return (
		<Button
			className={cn(search.tail && "border-info text-info hover:text-info")}
			onClick={handleClick}
			variant="outline"
			size="sm"
		>
			{search.tail ? (
				<CirclePause className="mr-2 h-4 w-4" />
			) : (
				<CirclePlay className="mr-2 h-4 w-4" />
			)}
			Live
		</Button>
	);
}
