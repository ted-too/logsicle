import { cn } from "@/lib/utils";
import type { IconProps } from ".";

export function LogsIcon({ className, ...props }: IconProps) {
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
			<path
				d="M12 29.3333H20C26.6666 29.3333 29.3333 26.6666 29.3333 20V12C29.3333 5.33329 26.6666 2.66663 20 2.66663H12C5.33329 2.66663 2.66663 5.33329 2.66663 12V20C2.66663 26.6666 5.33329 29.3333 12 29.3333Z"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<rect
				x="8.67004"
				y="10"
				width="14.66"
				height="2"
				rx="1"
				fill="currentColor"
			/>
			<rect
				x="8.67004"
				y="15"
				width="14.66"
				height="2"
				rx="1"
				fill="currentColor"
			/>
			<rect
				x="8.67004"
				y="20"
				width="14.66"
				height="2"
				rx="1"
				fill="currentColor"
			/>
		</svg>
	);
}
