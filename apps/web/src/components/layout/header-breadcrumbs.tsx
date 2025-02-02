"use client";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useLocation } from "@tanstack/react-router";

export function HeaderBreadcrumbs() {
  const pathname = useLocation({
    select: (location) => location.pathname,
  });

  const BREADCRUMBS = pathname
    .split("/")
    .slice(0, 1)
    .filter(Boolean)
    .map((path, i, arr) => ({
      href: `/${arr.slice(0, i + 1).join("/")}`,
      title: path,
    }));

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href="/">Home</BreadcrumbLink>
        </BreadcrumbItem>
        {BREADCRUMBS.length > 0 && <BreadcrumbSeparator />}
        <BreadcrumbItem>
          {BREADCRUMBS.map(
            (crumb) =>
              crumb.href === pathname && (
                <BreadcrumbLink key={crumb.href} href={crumb.href}>
                  {crumb.title}
                </BreadcrumbLink>
              )
          )}
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}
