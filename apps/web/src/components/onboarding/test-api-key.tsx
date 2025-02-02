import { Code } from "@/components/ui/code";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { userQueries } from "@/qc/queries/auth";
import { useRouter } from "@tanstack/react-router";
import { Check, Copy, TerminalIcon } from "lucide-react";
import { useState } from "react";
import { githubGist } from "react-syntax-highlighter/dist/esm/styles/hljs";
import { ActionButton } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";

const CURL_CODE = `curl -sX POST \
    -H "Content-Type: application/json" \
    -d '{
      "write_url": "https://app-tsdb.last9.io/v1/metrics/9a79d88299ee39be7184e1d3307b93f2/sender/github-ted-too/write", 
      "username": "b60a93f3-1c0d-407b-a873-f4ea90c413f9", 
      "password": "7e526071cbe70c9cd0986da50ec582f1"
    }' \
    https://app.last9.io/api/v4/organizations/github-ted-too/clusters/setup | sh`;

const TABS = [
  {
    label: "Try Locally",
    value: "local",
    language: "bash",
    code: CURL_CODE,
    Icon: TerminalIcon,
  },
  {
    label: "Javascript",
    value: "js",
    code: CURL_CODE,
    Icon: TerminalIcon,
  },
];

export function TestAPIKey() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { mutateAsync, isPending } = userQueries.update();
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopy = (value: string) => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  async function handleFinish() {
    await mutateAsync({ has_onboarded: true });
    await queryClient.refetchQueries({
      queryKey: userQueries.getUserQueryOptions.queryKey,
    });
    router.navigate({ to: "/dashboard" });
  }

  return (
    <div className="flex w-full flex-col gap-4">
      <Tabs defaultValue={TABS[0].value} className="w-full">
        <TabsList className="h-max gap-4 bg-transparent p-0">
          {TABS.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="h-10 gap-2 rounded-lg border text-xs font-bold data-[state=active]:border-primary/50 data-[state=active]:shadow-none"
            >
              <tab.Icon className="size-4" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {TABS.map((tab) => (
          <TabsContent key={tab.value} value={tab.value} className="mt-4">
            <div className="relative w-full rounded-xl bg-[#fafafa] p-4 font-mono text-xs">
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => handleCopy(tab.code)}
                      className="absolute right-1 top-2 flex h-max w-9 items-center justify-center rounded-e-lg border border-transparent text-muted-foreground/80 outline-offset-2 transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring/70 disabled:pointer-events-none disabled:cursor-not-allowed"
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
              <Code
                language={tab.language}
                style={githubGist}
                customStyle={{ background: "#fafafa", padding: 0 }}
              >
                {tab.code}
              </Code>
            </div>
          </TabsContent>
        ))}
      </Tabs>
      <ActionButton
        variant="caribbean"
        className="mt-4 w-20"
        onClick={async () => await handleFinish()}
        isLoading={isPending}
      >
        Finish
      </ActionButton>
    </div>
  );
}
