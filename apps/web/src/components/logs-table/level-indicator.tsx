import { getLevelColor } from "@/lib/request/level";
import { cn } from "@/lib/utils";
import type { LogLevel, RequestLevel } from "@repo/api";

export function LevelIndicator({ level }: { level: LogLevel | RequestLevel }) {
	return (
		<div className="flex items-center justify-center">
			<div
				className={cn("h-2.5 w-2.5 rounded-[2px]", getLevelColor(level).bg)}
			/>
		</div>
	);
}
