import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate, useParams, useSearch } from "@tanstack/react-router";
import { debounce } from "@tanstack/react-virtual";
import { PlayCircle } from "iconsax-react";
import { LoaderCircle, Search } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { Button } from "../ui/button";
import TimeRangePicker from "./timerange-picker";
import { useAppLogs } from "@/hooks/use-app-logs";

export function AppLogsPageHeader() {
  const params = useParams({
    from: "/_authd/$orgSlug/$projSlug/_dashboard/logs",
  });
  const searchParams = useSearch({
    from: "/_authd/$orgSlug/$projSlug/_dashboard/logs",
  });
  const navigate = useNavigate();
  const [isPending, startTransition] = useTransition();

  const { totalCount, filteredCount, isFetching } = useAppLogs();

  // Local state for immediate updates
  const [localSearch, setLocalSearch] = useState(searchParams.search || "");

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
              to: "/$orgSlug/$projSlug/logs",
              params,
              search: { ...searchParams, search: value },
            });
          });
        },
        300
      ),
    [navigate, params, searchParams]
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
    [debouncedNavigate]
  );

  return (
    <div className="flex items-center w-full justify-between">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-bold">Logs</h1>
      </div>
      <div>
        <div className="flex items-center gap-4">
          {/* TODO: make this part of the search input */}
          {searchParams.search !== undefined && (
            <span className="text-xs text-muted-foreground">
              Showing {filteredCount} of {totalCount} events
            </span>
          )}
          <TimeRangePicker />
          <div className="relative">
            <Label htmlFor="search-logs" className="sr-only">
              Search for a log
            </Label>
            <Input
              id="search-logs"
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
          <Button
            variant={searchParams.tail ? "caribbean" : "outline"}
            className="rounded-lg w-22"
            onClick={() =>
              navigate({
                to: "/$orgSlug/$projSlug/logs",
                params,
                search: { ...searchParams, tail: !searchParams.tail },
              })
            }
          >
            <PlayCircle variant="Bold" color="currentColor" />
            {searchParams.tail ? "Stop" : "Live"}
          </Button>
        </div>
      </div>
    </div>
  );
}
