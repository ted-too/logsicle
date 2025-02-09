"use client";

import { ActionButton, Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { apiKeysQueries } from "@/qc/queries/projects";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  API_KEY_SCOPE_INFO,
  APIKey,
  createAPIKeySchema,
  Project,
} from "@repo/api";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Check, CircleCheckIcon, CircleXIcon, Copy } from "lucide-react";
import { z } from "zod";
import { cn, tempApiKeyStorage } from "@/lib/utils";
import { toast } from "../ui/sonner-wrapper";

function CreatedAPIKey({
  apiKey,
  steps,
}: {
  apiKey: APIKey;
  steps: { next: () => void; prev: () => void };
}) {
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(apiKey.key);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // Store API key when component mounts
  useEffect(() => {
    tempApiKeyStorage.set(apiKey.key);
  }, [apiKey.key]);
  return (
    <div className="grid w-full grid-flow-row grid-cols-2 gap-4">
      <div className="flex items-start gap-4 w-full col-span-2">
        <div className="flex flex-col gap-2 w-[40%]">
          <span className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            Name
          </span>
          <span>{apiKey.name}</span>
        </div>
        <div className="flex flex-col gap-2 grow">
          <span className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            Key
          </span>
          <div className="flex w-full items-center justify-between">
            <span className="whitespace-nowrap">{apiKey.key}</span>
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleCopy}
                    className="flex h-full w-9 items-center justify-center rounded-e-lg border border-transparent text-muted-foreground/80 outline-offset-2 transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring/70 disabled:pointer-events-none disabled:cursor-not-allowed"
                    aria-label={copied ? "Copied" : "Copy to clipboard"}
                    disabled={copied}
                  >
                    <div
                      className={cn(
                        "transition-all",
                        copied ? "scale-100 opacity-100" : "scale-0 opacity-0"
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
                        copied ? "scale-0 opacity-0" : "scale-100 opacity-100"
                      )}
                    >
                      <Copy size={16} strokeWidth={2} aria-hidden="true" />
                    </div>
                  </button>
                </TooltipTrigger>
                <TooltipContent className="px-2 py-1 text-xs">
                  Copy to clipboard
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <p className="text-[0.8rem] text-muted-foreground">
            Make sure to save this somewhere as it will only be visible once
          </p>
        </div>
      </div>

      <div className="col-span-2 flex flex-col gap-2">
        <span className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          Scopes
        </span>
        <div className="flex flex-wrap gap-4">
          {API_KEY_SCOPE_INFO.length === apiKey.scopes.length ? (
            <div className="flex items-center gap-2">
              <CircleCheckIcon className="size-4 text-emerald-500" />
              <span>All permissions</span>
            </div>
          ) : (
            API_KEY_SCOPE_INFO.map((item) => (
              <div key={item.value} className="flex items-center gap-2">
                {apiKey.scopes.includes(item.value) ? (
                  <CircleCheckIcon className="size-4 text-emerald-500" />
                ) : (
                  <CircleXIcon className="size-4 text-red-500" />
                )}
                <span>{item.label}</span>
              </div>
            ))
          )}
        </div>
      </div>
      <ActionButton
        variant="caribbean"
        className="mt-4 w-20"
        onClick={() => steps.next()}
      >
        Next
      </ActionButton>
    </div>
  );
}

export function GenAPIKey({
  steps,
  project,
}: {
  steps: { next: () => void; prev: () => void };
  project: Project | undefined;
}) {
  const apiKeys: APIKey[] =
    project?.api_keys !== null ? (project?.api_keys ?? []) : [];
  const { mutateAsync: createAPIKey, data } = apiKeysQueries.create();
  const createdAPIKey =
    data ?? (apiKeys[0] !== undefined ? apiKeys[0] : undefined);
  const form = useForm<z.infer<typeof createAPIKeySchema>>({
    resolver: zodResolver(createAPIKeySchema),
    defaultValues:
      apiKeys[0] !== undefined
        ? {
            name: apiKeys[0].name,
            scopes: apiKeys[0].scopes,
          }
        : {
            name: "",
            scopes: [],
          },
  });

  async function onSubmit(input: z.infer<typeof createAPIKeySchema>) {
    if (!project) return toast.warning("Please create a project first");
    try {
      await createAPIKey({ projectId: project.id, input });
      toast.success("API key created successfully");
    } catch (error) {
      toast.APIError(error);
    }
  }

  if (createdAPIKey !== undefined)
    return <CreatedAPIKey apiKey={createdAPIKey} steps={steps} />;

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit, (v) => console.log(v))}
        className="grid grid-flow-row grid-cols-2 gap-4"
      >
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem className="col-span-2">
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="backend" {...field} required />
              </FormControl>
              <FormDescription>
                This will be used to identify your api key
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="scopes"
          render={() => (
            <FormItem className="col-span-2">
              <div className="flex items-center gap-4">
                <FormLabel aria-required>Scopes</FormLabel>
                <Button
                  type="button"
                  variant="link"
                  className="h-max p-0 text-xs"
                  onClick={() => {
                    form.setValue(
                      "scopes",
                      API_KEY_SCOPE_INFO.map((i) => i.value)
                    );
                  }}
                >
                  Select All
                </Button>
              </div>
              <FormDescription className="pb-2">
                What permissions should this API key have?
              </FormDescription>
              <div className="flex flex-col gap-4">
                {API_KEY_SCOPE_INFO.map((item) => (
                  <FormField
                    key={item.value}
                    control={form.control}
                    name="scopes"
                    render={({ field }) => {
                      return (
                        <FormItem
                          key={item.value}
                          className="flex flex-row items-center space-x-3 space-y-0"
                        >
                          <FormControl>
                            <Checkbox
                              className="rounded-lg"
                              checked={field.value?.includes(item.value)}
                              onCheckedChange={(checked) => {
                                return checked
                                  ? field.onChange([...field.value, item.value])
                                  : field.onChange(
                                      field.value?.filter(
                                        (value) => value !== item.value
                                      )
                                    );
                              }}
                            />
                          </FormControl>
                          <FormLabel className="text-sm font-normal">
                            {item.label}
                          </FormLabel>
                          <FormDescription>{item.description}</FormDescription>
                        </FormItem>
                      );
                    }}
                  />
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        <ActionButton
          type="submit"
          variant="caribbean"
          className="mt-4 w-20"
          isLoading={form.formState.isSubmitting}
          disabled={!form.formState.isDirty}
        >
          Next
        </ActionButton>
      </form>
    </Form>
  );
}
