import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTableSearchParams } from "./use-table-search-params";
import { LOG_INTERVALS, type LogInterval, INTERVAL_TO_POSTGRES_FORMAT } from "@repo/api";

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
