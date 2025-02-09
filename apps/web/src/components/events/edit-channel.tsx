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
import { updateChannelsMutations } from "@/qc/queries/update-channels";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  RadioGroup,
  RadioGroupIndicator,
  RadioGroupItem,
} from "@radix-ui/react-radio-group";
import {
  AVAILABLE_COLORS,
  LOG_RETENTION_DAYS,
  updateEventChannelSchema,
  type EventChannel,
} from "@repo/api";
import { useQueryClient } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { CircleCheckIcon, SquarePenIcon } from "lucide-react";
import { useState } from "react";
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
import { toast } from "../ui/sonner-wrapper";
import { projectsQueries } from "@/qc/queries/projects";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function EditChannel({ channel }: { channel: EventChannel }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { mutateAsync } = updateChannelsMutations.event.update();
  const { data: projects, isPending: projectsPending } =
    projectsQueries.list.useQuery();
  const params = useParams({
    from: "/_authd/_app/dashboard/$projId/events",
  });

  const form = useForm<z.infer<typeof updateEventChannelSchema>>({
    resolver: zodResolver(updateEventChannelSchema),
    defaultValues: channel,
  });

  // 2. Define a submit handler.
  async function onSubmit(values: z.infer<typeof updateEventChannelSchema>) {
    try {
      await mutateAsync({
        projectId: params.projId,
        channelId: channel.id,
        ...values,
      });
      await queryClient.refetchQueries({
        queryKey: ["projects", params.projId, "channels", "event"],
      });
      setOpen(false);
      form.reset();
      toast.success("Your changes have been saved successfully");
    } catch (error) {
      toast.APIError(error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              <Button
                variant="link"
                className="text-muted-foreground hover:text-primary p-0 h-max"
                disabled={open}
              >
                <SquarePenIcon />
              </Button>
            </DialogTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom" align="center">
            <p>Edit channel</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DialogContent
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
        className="max-w-xl"
        aria-describedby="edit-channel"
      >
        <DialogHeader className="space-y-0 gap-4 flex-row">
          <DialogTitle>Edit channel</DialogTitle>
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
              render={({ field: { value, ...field } }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="this happens after checkout"
                      value={value ?? undefined}
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
                              .find((p) => p.id === params.projId)
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
                    <FormLabel>Color</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value ?? undefined}
                        className="flex flex-wrap gap-2 min-h-9 items-center"
                      >
                        {AVAILABLE_COLORS.map((c) => (
                          <FormItem
                            key={c}
                            className="flex items-center space-x-3 space-y-0"
                          >
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
                            <FormLabel className="sr-only">
                              All new messages
                            </FormLabel>
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
              Update
            </ActionButton>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
