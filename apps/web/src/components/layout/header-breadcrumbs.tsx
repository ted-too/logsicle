"use client";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Link, useLocation } from "@tanstack/react-router";
import { Fragment } from "react/jsx-runtime";

export function HeaderBreadcrumbs() {
  const pathname = useLocation({
    select: (location) => location.pathname,
  });

  const splitPath = pathname.split("/").filter((v) => v !== "");
  const BREADCRUMBS = splitPath.slice(1).map((path, i) => ({
    href: `/${splitPath.slice(0, i + 2).join("/")}`,
    title: path.includes("proj_") ? "dashboard" : path,
  }));

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {BREADCRUMBS.map((crumb) => (
          <Fragment key={crumb.href}>
            <BreadcrumbItem>
              <BreadcrumbLink className="capitalize" asChild>
                <Link to={crumb.href}>{crumb.title}</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator
              className="last:hidden"
            />
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
