import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

function Skeleton({ className, ...props }: ComponentProps<"div">) {
	return (
		<div
			className={cn("animate-pulse rounded-md bg-primary/10", className)}
			{...props}
		/>
	);
}

export { Skeleton };
