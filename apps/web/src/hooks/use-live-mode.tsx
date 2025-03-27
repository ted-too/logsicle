import * as React from "react";

// TODO: make a BaseObject (incl. date and uuid e.g. for every upcoming branch of infinite table)
export function useLiveMode<TData extends { timestamp: string }>(
  data: TData[],
  { tail: live }: { tail?: boolean }
) {
  // REMINDER: used to capture the live mode on timestamp
  const liveTimestamp = React.useRef<number | undefined>(
    live ? new Date().getTime() : undefined
  );

  React.useEffect(() => {
    if (live) liveTimestamp.current = new Date().getTime();
    else liveTimestamp.current = undefined;
  }, [live]);

  const anchorRow = React.useMemo(() => {
    if (!live) return undefined;

    const item = data.find((item) => {
      // return first item that is there if not liveTimestamp
      if (!liveTimestamp.current) return true;
      // return first item that is after the liveTimestamp
      if (new Date(item.timestamp).getTime() > liveTimestamp.current)
        return false;
      return true;
      // return first item if no liveTimestamp
    });

    return item;
  }, [live, data]);

  return { row: anchorRow, timestamp: liveTimestamp.current };
}
