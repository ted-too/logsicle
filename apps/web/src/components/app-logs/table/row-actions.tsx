import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { AppLog } from "@repo/api";
import { CellContext, HeaderContext } from "@tanstack/react-table";
import { Setting3 } from "iconsax-react";
import { Ellipsis } from "lucide-react";
import { useState } from "react";

export function RowActions({ cell }: CellContext<AppLog, unknown>) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="flex justify-center">
          <Button
            size="icon"
            variant="trueGhost"
            className="shadow-none hover:border-none"
            aria-label="Edit item"
          >
            <Ellipsis size={16} strokeWidth={2} aria-hidden="true" />
          </Button>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem>
          <span>View</span>
          <DropdownMenuShortcut>⌘E</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-destructive focus:text-destructive">
          <span>Delete</span>
          <DropdownMenuShortcut>⌘⌫</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ColumnVisibility({ table }: HeaderContext<AppLog, unknown>) {
  const [isOpen, setIsOpen] = useState(false);

  const containerRef = table.options.meta?.containerRef;
  const totalVisibleColumns = table.getVisibleFlatColumns().length;

  const scrollToRight = () => {
    if (!containerRef?.current) return;
    const container = containerRef.current;
    container.scrollLeft = container.scrollWidth - container.clientWidth;
  };
  return (
    <DropdownMenu onOpenChange={setIsOpen} open={isOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="trueGhost"
          className="size-7 shadow-none bg-transparent"
        >
          <Setting3
            size={16}
            color="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="font-mono">
        <DropdownMenuLabel className="text-xs">
          Toggle columns
        </DropdownMenuLabel>
        {table
          .getAllColumns()
          .filter((column) => column.getCanHide())
          .map((column) => {
            return (
              <DropdownMenuCheckboxItem
                key={column.id}
                className="capitalize text-xs"
                checked={column.getIsVisible()}
                onCheckedChange={(value) => {
                  column.toggleVisibility(!!value);
                  // Scroll to right after column visibility changes
                  setTimeout(scrollToRight, 0);
                }}
                onSelect={(event) => event.preventDefault()}
              >
                {column.id}
              </DropdownMenuCheckboxItem>
            );
          })}
        <DropdownMenuItem
          disabled={
            totalVisibleColumns - 1 ===
            table.getAllColumns().filter((column) => column.getCanHide()).length
          }
          className="capitalize text-xs hover:underline text-muted-foreground hover:text-primary"
          onSelect={(event) => {
            event.preventDefault();
            table.resetColumnVisibility(true);
            // Scroll to right after resetting columns
            setTimeout(scrollToRight, 0);
          }}
        >
          <span>Show all</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
