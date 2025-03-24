import { cn } from "@/lib/utils";
import type React from "react";

interface TableProps extends React.ComponentProps<"table"> {
	containerClassName?: string;
	onViewportScroll?: React.UIEventHandler<HTMLDivElement> | undefined;
}

function Table({
	ref,
	className,
	onViewportScroll,
	containerClassName,
	...props
}: TableProps) {
	return (
		<div
			className={cn(
				"relative w-full overflow-auto bg-background h-full border rounded-lg shadow-xs",
				containerClassName,
			)}
			onScroll={onViewportScroll}
			ref={ref}
		>
			<table
				className={cn("w-full caption-bottom text-sm", className)}
				{...props}
			/>
		</div>
	);
}

type TableHeaderProps = React.HTMLAttributes<HTMLTableSectionElement>;

function TableHeader({ className, ...props }: TableHeaderProps) {
	return <thead className={cn(className)} {...props} />;
}

type TableBodyProps = React.HTMLAttributes<HTMLTableSectionElement>;

function TableBody({ className, ...props }: TableBodyProps) {
	return (
		<tbody className={cn("[&_tr:last-child]:border-0", className)} {...props} />
	);
}

type TableFooterProps = React.HTMLAttributes<HTMLTableSectionElement>;

function TableFooter({ className, ...props }: TableFooterProps) {
	return (
		<tfoot
			className={cn(
				"border-t border-border bg-muted/50 font-medium [&>tr]:last:border-b-0",
				className,
			)}
			{...props}
		/>
	);
}

type TableRowProps = React.HTMLAttributes<HTMLTableRowElement>;

function TableRow({ className, ...props }: TableRowProps) {
	return (
		<tr
			className={cn(
				"border-b border-border transition-colors group hover:bg-muted/50 data-[state=selected]:bg-muted",
				className,
			)}
			{...props}
		/>
	);
}

type TableHeadProps = React.ComponentProps<"th">;

function TableHead({ className, ...props }: TableHeadProps) {
	return (
		<th
			className={cn(
				"h-12 px-3 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:w-px [&:has([role=checkbox])]:pr-0",
				className,
			)}
			{...props}
		/>
	);
}

type TableCellProps = React.ComponentProps<"td">;

function TableCell({ className, ...props }: TableCellProps) {
	return (
		<td
			className={cn(
				"px-2.5 h-9 align-middle [&:has([role=checkbox])]:pr-0 group-hover:bg-muted/50",
				className,
			)}
			{...props}
		/>
	);
}

type TableCaptionProps = React.HTMLAttributes<HTMLTableCaptionElement>;

function TableCaption({ className, ...props }: TableCaptionProps) {
	return (
		<caption
			className={cn("mt-4 text-sm text-muted-foreground", className)}
			{...props}
		/>
	);
}

export {
	Table,
	TableBody,
	TableCaption,
	TableCell,
	TableFooter,
	TableHead,
	TableHeader,
	TableRow,
};
