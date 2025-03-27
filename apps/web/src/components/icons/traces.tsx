import { cn } from "@/lib/utils";
import type { IconProps } from ".";

export function TracesIcon({ className, ...props }: IconProps) {
	return (
		<svg
			width="32"
			height="32"
			viewBox="0 0 32 32"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className={cn("size-5", className)}
			{...props}
		>
			<rect x="2.5" y="5" width="27" height="4" rx="1.5" fill="currentColor" />
			<rect x="2.5" y="13" width="9" height="4" rx="1.25" fill="currentColor" opacity={1} />
			<rect x="11.5" y="19" width="9" height="4" rx="1.25" fill="currentColor" opacity={0.8} />
			<rect x="20.5" y="25" width="9" height="4" rx="1.25" fill="currentColor" opacity={0.6} />
		</svg>
	);
}
