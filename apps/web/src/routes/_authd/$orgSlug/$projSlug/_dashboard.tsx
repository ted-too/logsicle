import { AppSidebar } from "@/components/layout/app-sidebar";
import {
  SECONDARY_SIDEBAR_COOKIE_NAME,
  SIDEBAR_COOKIE_MAX_AGE,
  SIDEBAR_COOKIE_NAME,
} from "@/components/ui/sidebar";
import { Outlet, createFileRoute, notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getCookie, setCookie } from "@tanstack/react-start/server";
import { z } from "zod";

const getSidebarStates = createServerFn().handler(async () => {
  let sidebarState = getCookie(SIDEBAR_COOKIE_NAME);
  let secondarySidebarState = getCookie(SECONDARY_SIDEBAR_COOKIE_NAME);

  if (sidebarState === undefined) {
    sidebarState = "true";
    setCookie(SIDEBAR_COOKIE_NAME, sidebarState, {
      maxAge: SIDEBAR_COOKIE_MAX_AGE,
    });
  }

  if (secondarySidebarState === undefined) {
    secondarySidebarState = "true";
    setCookie(SECONDARY_SIDEBAR_COOKIE_NAME, secondarySidebarState, {
      maxAge: SIDEBAR_COOKIE_MAX_AGE,
    });
  }

  return {
    sidebarState: sidebarState === "true",
    secondarySidebarState: secondarySidebarState === "true",
  };
});

export const setSidebarStates = createServerFn({ method: "POST" })
  .validator(
    z.object({
      sidebarState: z.boolean().optional(),
      secondarySidebarState: z.boolean().optional(),
    })
  )
  .handler(async ({ data }) => {
    if (data.sidebarState !== undefined) {
      setCookie(SIDEBAR_COOKIE_NAME, data.sidebarState ? "true" : "false", {
        maxAge: SIDEBAR_COOKIE_MAX_AGE,
      });
    }

    if (data.secondarySidebarState !== undefined) {
      setCookie(
        SECONDARY_SIDEBAR_COOKIE_NAME,
        data.secondarySidebarState ? "true" : "false",
        {
          maxAge: SIDEBAR_COOKIE_MAX_AGE,
        }
      );
    }
  });

export const Route = createFileRoute("/_authd/$orgSlug/$projSlug/_dashboard")({
  beforeLoad: async ({ context, params }) => {
    const { orgSlug, projSlug } = params;
    const currentUserOrg = context.userOrgs?.find(
      (org) => org.organization.slug === orgSlug
    );

    const currentProject = currentUserOrg?.organization.projects.find(
      (proj) => proj.slug === projSlug
    );

    if (!currentUserOrg || !currentProject) {
      throw notFound();
    }

    const sidebarStates = await getSidebarStates();

    return {
      ...context,
      sidebarStates,
      currentUserOrg,
      currentProject,
    };
  },
  component: LayoutComponent,
});

function LayoutComponent() {
  return (
    <AppSidebar>
      <Outlet />
    </AppSidebar>
  );
}
