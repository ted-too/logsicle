import type { AppLog } from "@repo/api"
import type { CellContext } from "@tanstack/react-table"
import { AppLogSheet } from "./app-log-sheet"

export function BodyCell({ row }: CellContext<AppLog, unknown>) {
  const log = row.original

  return (
    <AppLogSheet log={log}>
      <div className="truncate cursor-pointer hover:underline">{JSON.stringify(log.fields)}</div>
    </AppLogSheet>
  )
}

