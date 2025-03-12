import { z } from "zod";
import {
  eachDayOfInterval,
  eachHourOfInterval,
  eachMinuteOfInterval,
  addMinutes,
  addHours,
  addDays,
} from "date-fns";

export const optionalStringSchema = z
  .string()
  .optional()
  .transform((v) => v || undefined);

export const optionalArraySchema = z
  .array(z.string())
  .optional()
  .transform((v) => (v?.length ? v : undefined));

export const dateTimeSchema = z
  .union([z.string(), z.date()])
  .transform((v) => new Date(v));

export const timeRangeSchema = {
  // start: dateTimeNearest15MinSchema.catch(sub(new Date(), { hours: 4 })),
  start: dateTimeSchema.catch(new Date(0)),
  end: dateTimeSchema.catch(new Date(0)),
};

// apps/web/src/lib/utils.ts or a new file like apps/web/src/lib/date-utils.ts

export function suggestInterval(start: Date, end: Date): string {
  const duration = end.getTime() - start.getTime();
  const hours = duration / (1000 * 60 * 60); // Convert to hours

  switch (true) {
    case hours <= 2:
      return "1 minute";
    case hours <= 6:
      return "5 minutes";
    case hours <= 24:
      return "15 minutes";
    case hours <= 24 * 7: // 7 days
      return "1 hour";
    case hours <= 24 * 30: // 30 days
      return "6 hours";
    default:
      return "1 day";
  }
}

export const VALID_INTERVALS = [
  "1 minute",
  "5 minutes",
  "15 minutes",
  "30 minutes",
  "1 hour",
  "3 hours",
  "6 hours",
  "12 hours",
  "1 day",
  "7 days",
  "30 days",
] as const;

export const validIntervalSchema = z.enum(VALID_INTERVALS);

export type ValidInterval = z.infer<typeof validIntervalSchema>;

export function eachIntervalOfRange(
  rawStart: Date | string,
  rawEnd: Date | string,
  interval: ValidInterval
): Date[] {
  // Parse the interval string
  const [amount, unit] = interval.split(" ");
  const numericAmount = parseInt(amount, 10);

  const start = new Date(rawStart);
  const end = new Date(rawEnd);

  switch (unit) {
    case "minute":
    case "minutes":
      if (numericAmount === 1) {
        return eachMinuteOfInterval({ start, end });
      } else {
        const result: Date[] = [];
        let current = start;
        while (current <= end) {
          result.push(current);
          current = addMinutes(current, numericAmount);
        }
        return result;
      }

    case "hour":
    case "hours":
      if (numericAmount === 1) {
        return eachHourOfInterval({ start, end });
      } else {
        const result: Date[] = [];
        let current = start;
        while (current <= end) {
          result.push(current);
          current = addHours(current, numericAmount);
        }
        return result;
      }

    case "day":
    case "days":
      if (numericAmount === 1) {
        return eachDayOfInterval({ start, end });
      } else {
        const result: Date[] = [];
        let current = start;
        while (current <= end) {
          result.push(current);
          current = addDays(current, numericAmount);
        }
        return result;
      }

    default:
      throw new Error(`Unsupported interval: ${interval}`);
  }
}
