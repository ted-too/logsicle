import type { SheetField } from "@/components/data-table/types";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface SheetDetailsContentSkeletonProps<TData, TMeta> {
	fields: SheetField<TData, TMeta>[];
}

export function SheetDetailsContentSkeleton<TData, TMeta>({
	fields,
}: SheetDetailsContentSkeletonProps<TData, TMeta>) {
	return (
		<dl className="divide-y">
			{fields.map((field) => (
				<div
					key={field.id.toString()}
					className="flex gap-4 py-2 text-sm justify-between items-center"
				>
					<dt className="shrink-0 text-muted-foreground">{field.label}</dt>
					<div>
						<Skeleton className={cn("h-5 w-52", field.skeletonClassName)} />
					</div>
				</div>
			))}
		</dl>
	);
}
