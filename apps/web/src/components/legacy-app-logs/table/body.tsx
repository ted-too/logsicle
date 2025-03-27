import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { AppLog } from "@repo/api";
import {
	type Row,
	type Table,
	type TableState,
	flexRender,
} from "@tanstack/react-table";
import type { Virtualizer } from "@tanstack/react-virtual";
import {
	ArrowLeftToLine,
	ArrowRightToLine,
	Ellipsis,
	PinOff,
} from "lucide-react";
import { memo } from "react";
import { getPinningStyles } from "./columns";

function RawTableRowComponent({
	row,
	style,
}: {
	row: Row<AppLog>;
	tableState: TableState;
	style: React.CSSProperties;
}) {
	return (
		<TableRow data-state={row.getIsSelected() && "selected"} style={style}>
			{row.getVisibleCells().map((cell) => {
				const { column } = cell;
				const isPinned = column.getIsPinned();
				const isLastLeftPinned =
					isPinned === "left" && column.getIsLastColumn("left");
				const isFirstRightPinned =
					isPinned === "right" && column.getIsFirstColumn("right");
				return (
					<TableCell
						key={cell.id}
						className="truncate [&[data-pinned=left][data-last-col=left]]:border-r [&[data-pinned=right][data-last-col=right]]:border-l [&[data-pinned][data-last-col]]:border-border [&[data-pinned]]:bg-background/90 [&[data-pinned]]:backdrop-blur-sm"
						style={{ ...getPinningStyles(column) }}
						data-pinned={isPinned || undefined}
						data-last-col={
							isLastLeftPinned
								? "left"
								: isFirstRightPinned
									? "right"
									: undefined
						}
					>
						{flexRender(cell.column.columnDef.cell, cell.getContext())}
					</TableCell>
				);
			})}
		</TableRow>
	);
}

const TableRowComponent = memo(RawTableRowComponent, (prev, next) => {
	const prevState = prev.tableState;
	const nextState = next.tableState;

	const leftSame =
		JSON.stringify(prevState.columnPinning.left) ===
		JSON.stringify(nextState.columnPinning.left);
	const rightSame =
		JSON.stringify(prevState.columnPinning.right) ===
		JSON.stringify(nextState.columnPinning.right);

	const visibilitySame =
		prevState.columnVisibility === nextState.columnVisibility;

	// TODO: potentially throttle data same because it's expensive
	const dataSame = prev.row.original === next.row.original;

	return leftSame && rightSame && visibilitySame && dataSame;
});

export function Body({
	table,
	rowVirtualizer,
}: {
	table: Table<AppLog>;
	rowVirtualizer: Virtualizer<HTMLTableElement, Element>;
}) {
	const virtualRows = rowVirtualizer.getVirtualItems();
	const rows = table.getRowModel().rows;

	return (
		<TableBody
			style={{
				display: "grid",
				height: `${rowVirtualizer.getTotalSize()}px`, //tells scrollbar how big the table is
				position: "relative", //needed for absolute positioning of rows
			}}
		>
			{virtualRows.length > 0 ? (
				virtualRows.map((virtualRow) => {
					const row = rows[virtualRow.index];
					return (
						<TableRowComponent
							key={row.id}
							row={row}
							tableState={table.getState()}
							data-state={row.getIsSelected() && "selected"}
							style={{
								position: "absolute",
								transform: `translateY(${virtualRow.start}px)`, //this should always be a `style` as it changes on scroll
								width: "100%",
								height: 37,
								display: "flex",
							}}
						/>
					);
				})
			) : (
				<TableRow className="hover:bg-transparent">
					<TableCell
						colSpan={table.getFlatHeaders().length}
						className="h-48 group-hover:bg-transparent text-center flex justify-center items-center"
					>
						No results.
					</TableCell>
				</TableRow>
			)}
		</TableBody>
	);
}

function RawTableHeaderComponent({
	table,
}: {
	table: Table<AppLog>;
	tableState: TableState;
}) {
	return (
		<TableHeader className="sticky top-0 z-10 bg-[#FAFAFA]">
			{table.getHeaderGroups().map((headerGroup) => (
				<TableRow
					key={headerGroup.id}
					style={{
						display: "flex", // Make header row flex like body rows
						width: "100%",
					}}
				>
					{headerGroup.headers.map((header, hIdx) => {
						const { column } = header;
						const isPinned = column.getIsPinned();
						const isLastLeftPinned =
							isPinned === "left" && column.getIsLastColumn("left");
						const isFirstRightPinned =
							isPinned === "right" && column.getIsFirstColumn("right");

						return (
							<TableHead
								key={header.id}
								data-column-id={header.id}
								className="relative h-9 truncate [&:not([data-pinned]):has(+[data-pinned])_div.cursor-col-resize:last-child]:opacity-0 [&[data-last-col=left]_div.cursor-col-resize:last-child]:opacity-0 [&[data-pinned=left][data-last-col=left]]:border-r [&[data-pinned=right]:last-child_div.cursor-col-resize:last-child]:opacity-0 [&[data-pinned=right][data-last-col=right]]:border-l [&[data-pinned][data-last-col]]:border-border [&[data-pinned]]:bg-muted/90 [&[data-pinned]]:backdrop-blur-sm"
								colSpan={header.colSpan}
								style={{
									...getPinningStyles(column, true),
								}}
								data-pinned={isPinned || undefined}
								data-last-col={
									isLastLeftPinned
										? "left"
										: isFirstRightPinned
											? "right"
											: undefined
								}
							>
								<div className="flex items-center justify-between gap-2 w-full">
									<span className="truncate uppercase">
										{header.isPlaceholder
											? null
											: flexRender(
													header.column.columnDef.header,
													header.getContext(),
												)}
									</span>
									{/* Pin/Unpin column controls with enhanced accessibility */}
									{!header.isPlaceholder &&
										header.column.getCanPin() &&
										(header.column.getIsPinned() ? (
											<Button
												size="icon"
												variant="ghost"
												className="-mr-1 size-7 shadow-none"
												onClick={() => header.column.pin(false)}
												aria-label={`Unpin ${header.column.columnDef.header as string} column`}
												title={`Unpin ${header.column.columnDef.header as string} column`}
											>
												<PinOff
													className="opacity-60"
													size={16}
													strokeWidth={2}
													aria-hidden="true"
												/>
											</Button>
										) : (
											<DropdownMenu>
												<DropdownMenuTrigger asChild>
													<Button
														size="icon"
														variant="ghost"
														className="-mr-1 size-7 shadow-none"
														aria-label={`Pin options for ${header.column.columnDef.header as string} column`}
														title={`Pin options for ${header.column.columnDef.header as string} column`}
													>
														<Ellipsis
															className="opacity-60"
															size={16}
															strokeWidth={2}
															aria-hidden="true"
														/>
													</Button>
												</DropdownMenuTrigger>
												<DropdownMenuContent align="end">
													<DropdownMenuItem
														onClick={() => header.column.pin("left")}
														className="text-xs [&>svg]:size-3.5"
													>
														<ArrowLeftToLine
															size={14}
															strokeWidth={2}
															className="opacity-60"
															aria-hidden="true"
														/>
														Stick to left
													</DropdownMenuItem>
													<DropdownMenuItem
														onClick={() => header.column.pin("right")}
														className="text-xs [&>svg]:size-3.5"
													>
														<ArrowRightToLine
															size={14}
															strokeWidth={2}
															className="opacity-60"
															aria-hidden="true"
														/>
														Stick to right
													</DropdownMenuItem>
												</DropdownMenuContent>
											</DropdownMenu>
										))}
									{header.column.getCanResize() && (
										<div
											{...{
												onDoubleClick: () => header.column.resetSize(),
												onMouseDown: header.getResizeHandler(),
												onTouchStart: header.getResizeHandler(),
												className: cn(
													"absolute top-0 h-full w-4 cursor-col-resize user-select-none touch-none -right-2 z-10 flex justify-center before:absolute before:w-px before:inset-y-0 before:bg-border before:-translate-x-px",
													hIdx === table.getFlatHeaders().length - 1 &&
														"before:bg-transparent",
												),
											}}
										/>
									)}
								</div>
							</TableHead>
						);
					})}
				</TableRow>
			))}
		</TableHeader>
	);
}

export const TableHeaderComponent = memo(
	RawTableHeaderComponent,
	(prev, next) => {
		const prevState = prev.tableState;
		const nextState = next.tableState;

		const leftSame =
			JSON.stringify(prevState.columnPinning.left) ===
			JSON.stringify(nextState.columnPinning.left);
		const rightSame =
			JSON.stringify(prevState.columnPinning.right) ===
			JSON.stringify(nextState.columnPinning.right);

		const visibilitySame =
			prevState.columnVisibility === nextState.columnVisibility;

		return leftSame && rightSame && visibilitySame;
	},
);
