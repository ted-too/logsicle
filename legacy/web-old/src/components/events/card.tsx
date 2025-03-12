import { formatDistanceToNow, formatISO9075 } from "date-fns";
import { Check, ChevronRight, Copy, Info, Trash2Icon, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { fromDate, getLocalTimeZone } from "@internationalized/date";
import type { EventLog } from "@repo/api";
import { memo, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { eventsMutations } from "@/qc/queries/events";
import { toast } from "../ui/sonner-wrapper";
import { Button } from "../ui/button";

interface EventCardProps {
  event: EventLog;
  style?: React.CSSProperties;
  className?: string;
}

function InternalEventCard({ event, className }: EventCardProps) {
  const localTimezone = getLocalTimeZone();
  const zonedDateTime = formatISO9075(
    fromDate(new Date(event.timestamp), localTimezone).toDate()
  );
  const [open, setOpen] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopy = (value: string) => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const queryClient = useQueryClient();
  const { mutateAsync } = eventsMutations.delete();

  async function handleDelete() {
    try {
      await mutateAsync({
        projectId: event.project_id,
        logId: event.id,
      });
      await queryClient.refetchQueries({
        queryKey: ["projects", event.project_id, "events"],
      });
      setOpen(false);
      toast.success(`Event log "${event.name}" deleted successfully`);
    } catch (error) {
      toast.APIError(error);
    }
  }

  const formattedDate = useMemo(
    () => formatDistanceToNow(new Date(event.timestamp), { addSuffix: true }),
    [event.timestamp]
  );

  const channelStyle = useMemo(
    () =>
      event.channel?.color
        ? ({
            "--channel-color": event.channel.color,
          } as React.CSSProperties)
        : {},
    [event.channel?.color]
  );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Card
          style={channelStyle}
          className={cn(
            "cursor-pointer shrink-0 transition-colors hover:bg-muted/50 rounded-md shadow-none p-4",
            className
          )}
        >
          <CardHeader className="flex flex-row shrink-0 h-full items-center justify-between space-y-0 p-0">
            <div className="flex flex-col h-full justify-between">
              <div className="flex items-center gap-4">
                <CardTitle className="text-base">{event.name}</CardTitle>
                {event.channel && (
                  <Badge
                    variant="secondary"
                    className="rounded-lg channel-badge"
                  >
                    {event.channel.name}
                  </Badge>
                )}
              </div>
              <CardDescription className="text-sm">
                {event.description}
              </CardDescription>
              <CardDescription className="text-xs">
                {formattedDate}
              </CardDescription>
            </div>
            <ChevronRight className="h-4 w-4" />
          </CardHeader>
        </Card>
      </SheetTrigger>
      <TooltipProvider>
        <SheetContent
          className="w-[400px] sm:w-[540px]"
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
          noClose
        >
          <SheetHeader className="space-y-4">
            <div className="flex items-center w-full justify-between">
              <SheetTitle className="text-2xl">{event.name}</SheetTitle>
              <SheetClose className="rounded-sm opacity-70 cursor-pointer ring-offset-background transition-opacity hover:opacity-100 focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary">
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </SheetClose>
            </div>
            <SheetDescription className="flex items-center gap-2">
              {event.channel && (
                <Badge
                  variant="secondary"
                  className="rounded-lg ml-1 channel-badge"
                  style={channelStyle}
                >
                  {event.channel.name}
                </Badge>
              )}
              <Tooltip>
                <TooltipTrigger>
                  <Info className="size-3" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>{localTimezone}</p>
                </TooltipContent>
              </Tooltip>
              <span>{zonedDateTime}</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="link"
                    className="text-destructive/80 hover:text-destructive p-0 h-max"
                    onClick={handleDelete}
                  >
                    <Trash2Icon />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" align="center">
                  <p>Delete</p>
                </TooltipContent>
              </Tooltip>
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-6">
            <div className="space-y-2">
              {event.description == "" ? (
                <span className="text-muted-foreground text-sm">
                  No description
                </span>
              ) : (
                <>
                  <h4 className="text-sm font-medium">Description</h4>
                  <p className="text-sm text-muted-foreground">
                    {event.description}
                  </p>
                </>
              )}
            </div>
            {event.metadata && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Metadata</h4>
                <pre className="rounded-lg bg-muted p-3 overflow-auto max-h-64 relative">
                  <TooltipProvider delayDuration={0}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() =>
                            handleCopy(JSON.stringify(event.metadata, null, 2))
                          }
                          className="absolute right-0.5 top-2 flex h-max w-9 items-center justify-center rounded-e-lg border border-transparent text-muted-foreground/80 outline-offset-2 transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:outline-2 focus-visible:outline-ring/70 disabled:pointer-events-none disabled:cursor-not-allowed"
                          aria-label={copied ? "Copied" : "Copy to clipboard"}
                          disabled={copied}
                        >
                          <div
                            className={cn(
                              "transition-all",
                              copied
                                ? "scale-100 opacity-100"
                                : "scale-0 opacity-0"
                            )}
                          >
                            <Check
                              className="stroke-emerald-500"
                              size={16}
                              strokeWidth={2}
                              aria-hidden="true"
                            />
                          </div>
                          <div
                            className={cn(
                              "absolute transition-all",
                              copied
                                ? "scale-0 opacity-0"
                                : "scale-100 opacity-100"
                            )}
                          >
                            <Copy
                              size={16}
                              strokeWidth={2}
                              aria-hidden="true"
                            />
                          </div>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="px-2 py-1 text-xs">
                        Copy to clipboard
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <code className="text-sm">
                    {JSON.stringify(event.metadata, null, 2)}
                  </code>
                </pre>
              </div>
            )}
            {event.tags && Object.keys(event.tags).length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Tags</h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(event.tags).map(([key, value]) => (
                    <div
                      key={key}
                      className="rounded-full bg-muted px-3 py-1 text-xs"
                    >
                      {key}: {value}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </SheetContent>
      </TooltipProvider>
    </Sheet>
  );
}

export const EventCard = memo(InternalEventCard);
