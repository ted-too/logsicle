import { ActionButton, Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { createChannelsMutations } from "@/qc/queries/create-channels";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  RadioGroup,
  RadioGroupIndicator,
  RadioGroupItem,
} from "@radix-ui/react-radio-group";
import {
  AVAILABLE_COLORS,
  createEventChannelSchema,
  LOG_RETENTION_DAYS,
  type EventChannel,
} from "@repo/api";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams, useSearch } from "@tanstack/react-router";
import { CircleCheckIcon, HashIcon, PlusIcon } from "lucide-react";
import { memo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Badge } from "../ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Separator } from "../ui/separator";
import { toast } from "../ui/sonner-wrapper";
import { projectsQueries } from "@/qc/queries/projects";
import { cn } from "@/lib/utils";

interface ChannelSelectorProps {
  channels: EventChannel[];
}

function InternalChannelSelector({ channels }: ChannelSelectorProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const params = useParams({
    from: "/_authd/_app/dashboard/$projId/events",
  });
  const { channelId, ...rest } = useSearch({
    from: "/_authd/_app/dashboard/$projId/events",
  });
  const [open, setOpen] = useState(false);
  const { projId } = useParams({
    from: "/_authd/_app/dashboard/$projId/events",
  });
  const { data: projects, isPending: projectsPending } =
    projectsQueries.list.useQuery();

  const allChannels: EventChannel[] = [
    {
      // @ts-expect-error this is just to make the code cleaner
      id: undefined,
      name: "all-events",
    },
    ...channels,
  ];

  const { mutateAsync } = createChannelsMutations.event.create();

  const form = useForm<z.infer<typeof createEventChannelSchema>>({
    resolver: zodResolver(createEventChannelSchema),
  });

  // 2. Define a submit handler.
  async function onSubmit(values: z.infer<typeof createEventChannelSchema>) {
    try {
      await mutateAsync({ projectId: params.projId, ...values });
      await queryClient.refetchQueries({
        queryKey: ["projects", params.projId, "channels", "event"],
      });
      setOpen(false);
      form.reset();
      toast.success("Your channel has been created successfully");
    } catch (error) {
      toast.APIError(error);
    }
  }

  return (
    <div className="flex flex-col">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            className="my-3.5 text-muted-foreground hover:text-primary justify-between rounded-lg"
          >
            Create channel <PlusIcon />
          </Button>
        </DialogTrigger>
        <DialogContent
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="max-w-xl"
          aria-describedby="create-channel"
        >
          <DialogHeader className="space-y-0 gap-4 flex-row">
            <DialogTitle>Create a channel</DialogTitle>
            <Badge variant="secondary" className="text-[10px] rounded-md">
              Events
            </Badge>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="grid grid-cols-1 grid-flow-row gap-3"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="payments" {...field} required />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="this happens after checkout"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 grid-flow-row gap-3">
                <FormField
                  control={form.control}
                  name="retention_days"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Retention</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={
                          projects !== undefined
                            ? projects
                                .find((p) => p.id === projId)
                                ?.log_retention_days.toString()
                            : field.value
                              ? field.value.toString()
                              : undefined
                        }
                        disabled={projectsPending}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {LOG_RETENTION_DAYS.map((days) => (
                            <SelectItem key={days} value={days.toString()}>
                              {days} days
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        How long your events shall be stored for
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="h-max">Color</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-wrap gap-4 h-9 items-center"
                        >
                          {AVAILABLE_COLORS.map((c) => (
                            <FormItem key={c}>
                              <FormControl>
                                <RadioGroupItem
                                  className="aspect-square cursor-pointer relative h-4 w-4 rounded-full focus:outline-none data-[state=checked]:border border-primary focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                  style={{ background: c }}
                                  value={c}
                                >
                                  <RadioGroupIndicator className="flex items-center justify-center absolute -top-2.5 -right-2.5">
                                    <CircleCheckIcon className="h-3.5 w-3.5 fill-primary stroke-background" />
                                  </RadioGroupIndicator>
                                </RadioGroupItem>
                              </FormControl>
                            </FormItem>
                          ))}
                        </RadioGroup>
                      </FormControl>
                      <FormDescription>
                        To help you quickly identify your event
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <ActionButton
                isLoading={form.formState.isSubmitting}
                type="submit"
                className="col-span-1 mt-4"
              >
                Create
              </ActionButton>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      <Separator />
      <div className="flex flex-col gap-3.5 mt-3.5">
        {allChannels.map((ch, i) => (
          <Button
            key={ch.id ?? "all"}
            variant={channelId === ch.id ? "secondary" : "ghost"}
            className={cn(
              "justify-between shadow-none",
              i > 0 && "channel-button"
            )}
            data-active={channelId === ch.id ? "true" : "false"}
            style={
              ch.color
                ? ({
                    "--channel-color": ch.color,
                  } as React.CSSProperties)
                : {}
            }
            onClick={() =>
              navigate({
                to: "/dashboard/$projId/events",
                params,
                search: { channelId: ch.id, ...rest },
              })
            }
          >
            <div className="flex items-center gap-2">
              <HashIcon
                className="h-4 w-4"
                style={
                  ch.color && channelId !== ch.id ? { color: ch.color } : {}
                }
              />
              {ch.name}
            </div>
          </Button>
        ))}
      </div>
    </div>
  );
}

export const ChannelSelector = memo(InternalChannelSelector);
