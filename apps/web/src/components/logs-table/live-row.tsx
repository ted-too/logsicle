import { TableCell, TableRow } from "@/components/custom/table";
import { appLogColumns } from "./app/columns";
import { LevelIndicator } from "./level-indicator";
import { requestLogColumns } from "./request/columns";

export function LiveRow({ type }: { type: "app" | "request" }) {
	return (
		<TableRow>
			<TableCell className="w-[--header-level-label-size] max-w-[--header-level-label-size] min-w-[--header-level-label-size] border-b border-t border-l border-info border-r border-r-info/50">
				<LevelIndicator level="info" />
			</TableCell>
			<TableCell
				colSpan={
					type === "app"
						? appLogColumns.length - 1
						: requestLogColumns.length - 1
				}
				className="border-b border-t border-r border-info text-info font-medium"
			>
				Live Mode
			</TableCell>
		</TableRow>
	);
}
