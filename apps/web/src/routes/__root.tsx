import { DefaultCatchBoundary } from "@/components/catch-boundary";
import { NotFound } from "@/components/not-found";
import { Toaster } from "@/components/ui/sonner";
import appCss from "@/index.css?url";
import starryNightCss from "@/starry-night.css?url";
import type { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import type { ReactNode } from "react";

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
}>()({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "Dashboard | Logsicle",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "stylesheet", href: starryNightCss },
    ],
  }),
  errorComponent: (props) => {
    return (
      <RootDocument>
        <DefaultCatchBoundary {...props} />
      </RootDocument>
    );
  },
  notFoundComponent: () => <NotFound />,
  component: RootComponent,
});

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  );
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body
        style={
          {
            "--content-height": "100svh",
          } as React.CSSProperties
        }
      >
        {children}
        <TanStackRouterDevtools position="bottom-right" />
        <ReactQueryDevtools buttonPosition="bottom-right" />
        <Toaster position="bottom-right" richColors />
        <Scripts />
      </body>
    </html>
  );
}
