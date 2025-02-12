"use client";

import { cn } from "@/lib/utils";
import { JSX } from "react";
import {
  DateFieldProps,
  DateField as DateFieldRac,
  DateInputProps as DateInputPropsRac,
  DateInput as DateInputRac,
  DateSegmentProps,
  DateSegment as DateSegmentRac,
  DateValue as DateValueRac,
  TimeFieldProps,
  TimeField as TimeFieldRac,
  TimeValue as TimeValueRac,
  composeRenderProps,
} from "react-aria-components";

const DateField = <T extends DateValueRac>({
  className,
  children,
  ...props
}: DateFieldProps<T>) => {
  return (
    <DateFieldRac
      className={composeRenderProps(className, (className) =>
        cn("space-y-2", className),
      )}
      {...props}
    >
      {children}
    </DateFieldRac>
  );
};

const TimeField = <T extends TimeValueRac>({
  className,
  children,
  ...props
}: TimeFieldProps<T>) => {
  return (
    <TimeFieldRac
      className={composeRenderProps(className, (className) =>
        cn("space-y-2", className),
      )}
      {...props}
    >
      {children}
    </TimeFieldRac>
  );
};

const DateSegment = ({ className, ...props }: DateSegmentProps) => {
  return (
    <DateSegmentRac
      className={composeRenderProps(className, (className) =>
        cn(
          "inline rounded p-0.5 text-foreground caret-transparent outline outline-0 data-[disabled]:cursor-not-allowed data-[focused]:bg-accent data-[invalid]:data-[focused]:bg-destructive data-[type=literal]:px-0 data-[focused]:data-[placeholder]:text-foreground data-[focused]:text-foreground data-[invalid]:data-[focused]:data-[placeholder]:text-destructive-foreground data-[invalid]:data-[focused]:text-destructive-foreground data-[invalid]:data-[placeholder]:text-destructive data-[invalid]:text-destructive data-[placeholder]:text-muted-foreground/70 data-[type=literal]:text-muted-foreground/70 data-[disabled]:opacity-50",
          className,
        ),
      )}
      {...props}
    />
  );
};

const dateInputStyle =
  "relative inline-flex h-9 w-full items-center overflow-hidden whitespace-nowrap rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm shadow-black/5 transition-shadow data-[focus-within]:border-ring data-[disabled]:opacity-50 data-[focus-within]:outline-none data-[focus-within]:ring-[3px] data-[focus-within]:ring-ring/20";
type DateDisplayType = "date" | "time" | "datetime";

type SegmentType = DateSegmentProps["segment"]["type"];

const SEGMENT_PRESETS: Record<DateDisplayType, SegmentType[]> = {
  date: ["month", "day", "year"],
  time: ["hour", "minute", "second", "dayPeriod"],
  datetime: ["month", "day", "year", "hour", "minute", "second", "dayPeriod"],
};

interface DateInputProps extends DateInputPropsRac {
  className?: string;
  unstyled?: boolean;
  display?: DateDisplayType | SegmentType[];
  timezone?: boolean;
  short?: boolean;
}

const DateInput = ({
  className,
  unstyled = false,
  display = "datetime",
  timezone = false,
  short = false,
  ...props
}: Omit<DateInputProps, "children">) => {
  // Convert preset to segment array if necessary
  const allowedSegments = Array.isArray(display)
    ? display
    : SEGMENT_PRESETS[display];

  return (
    <DateInputRac
      className={composeRenderProps(className, (className) =>
        cn(
          !unstyled && dateInputStyle,
          "[&[data-short=true]_[data-type=day]_+_[data-type=literal]]:hidden",
          "[&[data-short=true]_[data-type=year]]:hidden",
          "*:data-[type=timeZoneName]:ml-1 *:data-[type=timeZoneName]:bg-accent *:data-[type=timeZoneName]:text-xs *:data-[type=timeZoneName]:px-1",
          className,
        ),
      )}
      data-short={short}
      {...props}
    >
      {(segment) => {
        // For non-literal segments, just check if they're allowed
        if (segment.type !== "literal") {
          if (
            allowedSegments.includes(segment.type) ||
            (timezone && segment.type === "timeZoneName")
          ) {
            return <DateSegment segment={segment} />;
          }
          return <></>;
        }

        // For literals, we can check the text content to determine if it should be shown
        // This is a heuristic approach - we show "/", "," for dates and ":" for times
        const isDateLiteral = segment.text.includes("/");
        const isTimeLiteral = segment.text.includes(":");
        const isDateTimeSeparator = segment.text.includes(",");

        if (
          isDateLiteral &&
          allowedSegments.some((s) => ["month", "day", "year"].includes(s))
        ) {
          return <DateSegment segment={segment} />;
        }

        if (
          isTimeLiteral &&
          allowedSegments.some((s) => ["hour", "minute", "second"].includes(s))
        ) {
          return <DateSegment segment={segment} />;
        }

        if (
          isDateTimeSeparator &&
          allowedSegments.some((s) => ["month", "day", "year"].includes(s)) &&
          allowedSegments.some((s) => ["hour", "minute", "second"].includes(s))
        ) {
          return <DateSegment segment={segment} />;
        }

        return <></>;
      }}
    </DateInputRac>
  );
};

export { DateField, DateInput, DateSegment, TimeField, dateInputStyle };
export type { DateInputProps };
