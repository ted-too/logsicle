import { Slot } from "@radix-ui/react-slot";
import { ChevronRight, MoreHorizontal } from "lucide-react";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

type BreadcrumbProps = React.ComponentProps<"nav"> & {
	separator?: React.ReactNode;
};
function Breadcrumb({ ...props }: BreadcrumbProps) {
	return <nav aria-label="breadcrumb" {...props} />;
}

function BreadcrumbList({ className, ...props }: React.ComponentProps<"ol">) {
	return (
		<ol
			className={cn(
				"flex flex-wrap items-center gap-1.5 break-words text-sm text-muted-foreground sm:gap-2.5",
				className,
			)}
			{...props}
		/>
	);
}

function BreadcrumbItem({ className, ...props }: React.ComponentProps<"li">) {
	return (
		<li
			className={cn("inline-flex items-center gap-1.5", className)}
			{...props}
		/>
	);
}

type BreadcrumbLinkProps = React.ComponentProps<"a"> & {
	asChild?: boolean;
};

function BreadcrumbLink({ asChild, className, ...props }: BreadcrumbLinkProps) {
	const Comp = asChild ? Slot : "a";

	return (
		<Comp
			className={cn("transition-colors hover:text-foreground", className)}
			{...props}
		/>
	);
}

function BreadcrumbPage({ className, ...props }: React.ComponentProps<"span">) {
	return (
		// biome-ignore lint/a11y/useFocusableInteractive: does not need to be focusable
		<span
			role="link"
			aria-disabled="true"
			aria-current="page"
			className={cn("font-normal text-foreground", className)}
			{...props}
		/>
	);
}

function BreadcrumbSeparator({
	children,
	className,
	...props
}: ComponentProps<"li">) {
	return (
		<li
			role="presentation"
			aria-hidden="true"
			className={cn("[&>svg]:w-3.5 [&>svg]:h-3.5", className)}
			{...props}
		>
			{children ?? <ChevronRight />}
		</li>
	);
}

function BreadcrumbEllipsis({ className, ...props }: ComponentProps<"span">) {
	return (
		<span
			role="presentation"
			aria-hidden="true"
			className={cn("flex h-9 w-9 items-center justify-center", className)}
			{...props}
		>
			<MoreHorizontal className="h-4 w-4" />
			<span className="sr-only">More</span>
		</span>
	);
}

export {
	Breadcrumb,
	BreadcrumbList,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbPage,
	BreadcrumbSeparator,
	BreadcrumbEllipsis,
};
