"use client";

import { InputWithAddons } from "@/components/custom/input-with-addons";
import { useDataTable } from "@/components/data-table/provider";
import type { DataTableInputFilterField } from "@/components/data-table/types";
import { Label } from "@/components/ui/label";
import { useBasicDebounce } from "@/hooks/use-debounce";
import { Search } from "lucide-react";
import { useEffect, useState } from "react";

function getFilter(filterValue: unknown) {
	return typeof filterValue === "string" ? filterValue : null;
}

export function DataTableFilterInput<TData>({
	value: _value,
}: DataTableInputFilterField<TData>) {
	const value = _value as string;
	const { table, columnFilters } = useDataTable();
	const column = table.getColumn(value);
	const filterValue = columnFilters.find((i) => i.id === value)?.value;
	const currentValue = getFilter(filterValue) ?? "";
	const [internalValue, setInternalValue] = useState(currentValue);

	const debouncedValue = useBasicDebounce(internalValue, 250);

	useEffect(() => {
		column?.setFilterValue(debouncedValue);
	}, [debouncedValue]);

	useEffect(() => {
		setInternalValue(currentValue);
	}, [currentValue]);

	return (
		<div className="grid w-full gap-1.5">
			<Label htmlFor={value} className="sr-only px-2 text-muted-foreground">
				{value}
			</Label>
			<InputWithAddons
				placeholder="Search"
				leading={<Search className="mt-0.5 h-4 w-4" />}
				containerClassName="h-9 rounded-lg"
				name={value}
				id={value}
				value={internalValue}
				onChange={(e) => {
					const newValue =
						e.target.value.trim() === "" ? undefined : e.target.value;
					setInternalValue(newValue || "");
				}}
			/>
		</div>
	);
}
