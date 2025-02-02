"use client";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { usePathname } from "next/navigation";

const BREADCRUMBS = [
  {
    title: "Events",
    path: "/dashboard/events",
  },
];

export function HeaderBreadcrumbs() {
  const pathname = usePathname();

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href="/">Home</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          {BREADCRUMBS.map(
            (crumb) =>
              crumb.path === pathname && (
                <BreadcrumbLink key={crumb.path} href={crumb.path}>
                  {crumb.title}
                </BreadcrumbLink>
              )
          )}
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}
