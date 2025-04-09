"use client";

import { ActionButton } from "@/components/ui/button";
import { useAppForm } from "@/components/ui/form";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn, tempApiKeyStorage } from "@/lib/utils";
import {
  type APIKey,
  API_KEY_WRITE_SCOPE_INFO,
  type CreateAPIKeyRequest,
  createAPIKeySchema,
} from "@repo/api";
import { Check, CircleCheckIcon, CircleXIcon, Copy } from "lucide-react";
import { useState } from "react";
import type { z } from "zod";
import { toast } from "../ui/sonner-wrapper";
import { useRouteContext } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createAPIKey as serverCreateAPIKey } from "@/server/auth/api-keys";
import { getProjectsQueryOptions, projectsQueryKey } from "@/qc/teams/projects";
import { apiKeysQueryKey } from "@/qc/auth/api-keys";

export interface CreatedAPIKeyProps {
  apiKey: CreatedAPIKey;
  onDone?: () => void;
  showNextButton?: boolean;
  onNext?: () => void;
}

export function CreatedAPIKey({
  apiKey,
  onDone,
  showNextButton = false,
  onNext,
}: CreatedAPIKeyProps) {
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(apiKey.key);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    toast.success("API key copied to clipboard");
  };

  return (
    <div className="grid w-full grid-flow-row @4xl:grid-cols-2 gap-4">
      <div className="flex items-start @4xl:flex-row flex-col gap-4 w-full @4xl:col-span-2">
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
                    className="flex h-full w-9 items-center justify-center rounded-e-lg border border-transparent text-muted-foreground/80 outline-offset-2 transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:outline-2 focus-visible:outline-ring/70 disabled:pointer-events-none disabled:cursor-not-allowed"
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
          {API_KEY_WRITE_SCOPE_INFO.length === apiKey.scopes.length ? (
            <div className="flex items-center gap-2">
              <CircleCheckIcon className="size-4 text-emerald-500" />
              <span>All permissions</span>
            </div>
          ) : (
            API_KEY_WRITE_SCOPE_INFO.map((item) => (
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
      {showNextButton && onNext ? (
        <ActionButton
          variant="caribbean"
          className="mt-4 w-20"
          onClick={onNext}
        >
          Next
        </ActionButton>
      ) : onDone ? (
        <ActionButton className="mt-4 w-20" onClick={onDone}>
          Done
        </ActionButton>
      ) : null}
    </div>
  );
}

export interface GenAPIKeyProps {
  projectId?: string;
  onCreated?: (apiKey: APIKey) => void;
  onNext?: () => void;
  showNextButton?: boolean;
  existingApiKey?: APIKey;
}

interface CreatedAPIKey {
  id: string;
  name: string;
  key: string;
  scopes: string[];
  created_by: string;
  created_at: string;
}

export function GenAPIKey({
  projectId: providedProjectId,
  onCreated,
  onNext,
  showNextButton = false,
  existingApiKey,
}: GenAPIKeyProps) {
  const [createdApiKey, setCreatedApiKey] = useState<CreatedAPIKey | undefined>(
    existingApiKey
  );
  const queryClient = useQueryClient();

  const { currentUserOrg } = useRouteContext({
    from: providedProjectId
      ? "/_authd/$orgSlug/$projSlug/_dashboard"
      : "/_authd/$orgSlug/_onboarding/onboarding",
  });
  const { data: projects } = useQuery({
    ...getProjectsQueryOptions(),
    initialData: currentUserOrg.organization.projects,
  });

  let projectId = providedProjectId;
  if (!projectId) {
    projectId = projects?.[0].id;
  }

  const { mutateAsync: createAPIKey } = useMutation({
    mutationFn: async (input: {
      projectId: string;
      input: z.infer<typeof createAPIKeySchema>;
    }) => {
      const { data, error } = await serverCreateAPIKey({
        data: {
          projectId: input.projectId,
          body: input.input,
        },
      });
      if (error) return Promise.reject(error);
      return data;
    },
    onSuccess: (data) => {
      if (projectId) {
        queryClient.invalidateQueries({
          queryKey: apiKeysQueryKey(projectId),
        });
        queryClient.invalidateQueries({
          queryKey: projectsQueryKey,
        });
      }

      // For onboarding flow
      if (!projectId) {
        tempApiKeyStorage.set(data.key);
      }

      if (onCreated) {
        // Cast to APIKey since we know it's compatible
        onCreated(data as unknown as APIKey);
      }
    },
  });

  const form = useAppForm({
    defaultValues: {
      name: createdApiKey?.name ?? "",
      scopes:
        createdApiKey?.scopes ??
        API_KEY_WRITE_SCOPE_INFO.map((scope) => scope.value),
    } as CreateAPIKeyRequest,
    validators: {
      onSubmit: createAPIKeySchema,
    },
    onSubmit: async ({ value }) => {
      if (!projectId) {
        toast.warning("Please create a project first");
        return;
      }

      try {
        const apiKey = await createAPIKey({
          projectId,
          input: value,
        });

        setCreatedApiKey(apiKey);

        toast.success("API key created successfully");

        if (onNext) {
          onNext();
        }
      } catch (error) {
        toast.APIError(error);
      }
    },
  });

  if (createdApiKey !== undefined)
    return (
      <CreatedAPIKey
        apiKey={createdApiKey}
        showNextButton={showNextButton}
        onNext={onNext}
      />
    );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
      className="flex flex-col gap-4"
    >
      <form.AppField
        name="name"
        children={(field) => (
          <field.TextField
            label="Name"
            placeholder="backend"
            required
            description="A descriptive name to identify this API key"
          />
        )}
      />
      <form.AppField
        name="scopes"
        children={(field) => (
          <field.MultipleCheckboxField
            label="Scopes"
            options={API_KEY_WRITE_SCOPE_INFO}
            description="What permissions should this API key have?"
            selectAllLabel="Select all"
          />
        )}
      />
      <form.Subscribe
        selector={(state) => state.isDirty}
        children={(isDirty) => (
          <form.AppForm>
            <form.SubmitButton
              className="mt-4"
              disabled={!isDirty}
              size={showNextButton ? "default" : "lg"}
            >
              {showNextButton ? "Next" : "Create API Key"}
            </form.SubmitButton>
          </form.AppForm>
        )}
      />
    </form>
  );
}
