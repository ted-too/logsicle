"use client";

import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner-wrapper";
import { KeyIcon, Loader2 } from "lucide-react";
import { deleteAPIKey } from "@/server/auth/api-keys";
import { getApiKeysQueryOptions } from "@/qc/auth/api-keys";
import { CreateApiKey } from "@/components/teams/create-api-key";
import CopyToClipboardContainer from "@/components/copy-to-clipboard-container";

export const Route = createFileRoute(
  "/_authd/$orgSlug/$projSlug/_dashboard/settings/api-keys"
)({
  component: RouteComponent,
});

function RouteComponent() {
  const [revokeLoading, setRevokeLoading] = useState<string | null>(null);

  const { currentProject } = Route.useRouteContext();
  const queryClient = useQueryClient();

  const { data: apiKeys, isPending } = useQuery(
    getApiKeysQueryOptions(currentProject.id)
  );

  const revokeKeyMutation = useMutation({
    mutationFn: async (keyId: string) => {
      const { error } = await deleteAPIKey({
        data: {
          projectId: currentProject.id,
          keyId,
        },
      });

      if (error) {
        throw new Error(error.message || "Failed to revoke API key");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["projects", currentProject.id, "api-keys"],
      });
      toast.success("API key revoked successfully");
    },
  });

  const handleRevokeKey = async (id: string) => {
    setRevokeLoading(id);
    try {
      await revokeKeyMutation.mutateAsync(id);
    } catch (error) {
      toast.APIError(error);
    } finally {
      setRevokeLoading(null);
    }
  };

  if (isPending) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-lg md:text-xl">API Keys</CardTitle>
          <CardDescription className="text-xs md:text-sm">
            Manage your API keys
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="h-16 w-full animate-pulse bg-muted rounded-md" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="pr-4 w-full">
      <Card className="w-full pb-0">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg md:text-xl">API Keys</CardTitle>
            <CardDescription className="text-xs md:text-sm">
              Manage your API keys for programmatic access
            </CardDescription>
          </div>
          <CreateApiKey />
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {!apiKeys || apiKeys.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No API keys found. Create one to get started.
            </p>
          ) : (
            apiKeys.map((apiKey) => (
              <Card
                key={apiKey.id}
                className="flex flex-row items-center gap-3 px-4 py-3"
              >
                <KeyIcon className="size-4" />
                <div className="flex flex-col">
                  <span className="font-semibold text-sm">{apiKey.name}</span>
                  <span className="text-muted-foreground text-xs">
                    Created: {new Date(apiKey.created_at).toLocaleDateString()}
                  </span>
                </div>
                <Button
                  className="relative ms-auto"
                  disabled={revokeLoading === apiKey.id}
                  size="sm"
                  variant="outline"
                  onClick={() => handleRevokeKey(apiKey.id)}
                >
                  <span
                    className={
                      revokeLoading === apiKey.id ? "opacity-0" : "opacity-100"
                    }
                  >
                    Revoke
                  </span>
                  {revokeLoading === apiKey.id && (
                    <span className="absolute">
                      <Loader2 className="animate-spin h-4 w-4" />
                    </span>
                  )}
                </Button>
              </Card>
            ))
          )}
        </CardContent>
        <CardFooter className="rounded-b-xl border-t bg-muted p-6 dark:bg-transparent">
          <CardDescription className="text-xs md:text-sm h-max flex items-center gap-2">
            Project Id:
            <CopyToClipboardContainer
              align="horizontal"
              side="right"
              inset="outside"
              sideOffset={32}
            >
              {currentProject.id}
            </CopyToClipboardContainer>
          </CardDescription>
        </CardFooter>
      </Card>
    </div>
  );
}
