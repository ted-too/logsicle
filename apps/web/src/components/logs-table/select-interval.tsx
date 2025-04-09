import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	INTERVAL_TO_POSTGRES_FORMAT,
	LOG_INTERVALS,
	type LogInterval,
} from "@repo/api";
import { useTableSearchParams } from "../../hooks/use-table-search-params";

export function SelectInterval({ type }: { type: "app" | "request" }) {
	const { search, setSearch } = useTableSearchParams({ type });
	return (
		<Select
			value={search.interval}
			defaultValue={"24h" as LogInterval}
			onValueChange={(value) => setSearch({ interval: value as LogInterval })}
		>
			<SelectTrigger className="w-[180px]">
				<SelectValue placeholder="Select interval" />
			</SelectTrigger>
			<SelectContent>
				<SelectGroup>
					<SelectLabel>Interval</SelectLabel>
					{LOG_INTERVALS.map((interval) => (
						<SelectItem key={interval} value={interval}>
							{INTERVAL_TO_POSTGRES_FORMAT[interval]}
						</SelectItem>
					))}
				</SelectGroup>
			</SelectContent>
		</Select>
	);
}
