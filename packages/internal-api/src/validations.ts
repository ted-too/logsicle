import { z } from "zod";
import {
  eachMinuteOfInterval,
  addMinutes,
  eachHourOfInterval,
  addHours,
} from "date-fns";

// Common log intervals used across different log types
// These are short notations that get converted to PostgreSQL interval format on the server side
// e.g. "1m" -> "1 minute", "5m" -> "5 minutes", "1h" -> "1 hour", etc.
export const LOG_INTERVALS = [
  "1m",  // 1 minute - for detailed troubleshooting
  "5m",  // 5 minutes
  "15m", // 15 minutes
  "30m", // 30 minutes
  "1h",  // 1 hour
  "6h",  // 6 hours
  "12h", // 12 hours
  "24h", // 24 hours (1 day)
] as const;
export type LogInterval = (typeof LOG_INTERVALS)[number];

// Mapping from short interval notation to PostgreSQL interval format
// This is primarily for documentation; the actual conversion happens server-side
export const INTERVAL_TO_POSTGRES_FORMAT: Record<LogInterval, string> = {
  "1m": "1 minute",
  "5m": "5 minutes",
  "15m": "15 minutes",
  "30m": "30 minutes",
  "1h": "1 hour",
  "6h": "6 hours",
  "12h": "12 hours",
  "24h": "1 day",
};

// Common log levels
export const LOG_LEVELS = [
  "debug",
  "info",
  "warning",
  "error",
  "fatal",
] as const;
export type LogLevel = (typeof LOG_LEVELS)[number];

// Base pagination schema that's common across listing endpoints
export const basePaginationSchema = z.object({
  limit: z.number().min(1).max(100).optional(),
  page: z.number().min(1).optional(),
});

const transformTimestamp = (val: number | string | Date | undefined) => {
  if (val === undefined) return undefined;
  if (typeof val === "number") return val;
  // If it's a Date object or string, convert to timestamp
  return new Date(val).getTime();
};

// Time range schema common to all time-based queries
export const timeRangeSchema = z.object({
  start: z.coerce.number().optional().transform(transformTimestamp),
  end: z.coerce.number().optional().transform(transformTimestamp),
});

// Common metrics schema with time range and interval
export const baseMetricsSchema = timeRangeSchema.extend({
  interval: z.enum(LOG_INTERVALS).optional(),
});

// Helper to create time-ranged paginated schema
export function createTimeRangedPaginatedSchema<T extends z.ZodRawShape>(
  extraFields: T
) {
  return timeRangeSchema.extend({
    id: z.string().optional(),
    search: z.string().optional(),
    sort: z.array(z.string()).optional(), // will be in the format of <column_id>:<asc|desc>
    ...basePaginationSchema.shape,
    ...extraFields,
  });
}

// Helper fns
export function suggestInterval(start: number, end: number): LogInterval {
  const duration = end - start;
  const hours = duration / (1000 * 60 * 60); // Convert to hours

  switch (true) {
    case hours <= 2:
      return "1m";
    case hours <= 6:
      return "5m";
    case hours <= 12:
      return "15m";
    case hours <= 24:
      return "30m";
    case hours <= 24 * 3: // 3 days
      return "1h";
    case hours <= 24 * 7: // 7 days
      return "6h";
    case hours <= 24 * 14: // 14 days
      return "12h";
    default:
      return "24h";
  }
}

export function eachIntervalOfRange(
  rawStart: number | string | Date,
  rawEnd: number | string | Date,
  interval: LogInterval
): Date[] {
  // Parse the interval string like "1h" into amount and unit
  const amount = Number.parseInt(interval.slice(0, -1), 10);
  const unit = interval.slice(-1);

  const start =
    typeof rawStart === "number" ? new Date(rawStart) : new Date(rawStart);
  const end = typeof rawEnd === "number" ? new Date(rawEnd) : new Date(rawEnd);

  switch (unit) {
    case "m": {
      if (amount === 1) {
        return eachMinuteOfInterval({ start, end });
      }
      const result: Date[] = [];
      let current = start;
      while (current <= end) {
        result.push(current);
        current = addMinutes(current, amount);
      }
      return result;
    }

    case "h": {
      if (amount === 1) {
        return eachHourOfInterval({ start, end });
      }
      const result: Date[] = [];
      let current = start;
      while (current <= end) {
        result.push(current);
        current = addHours(current, amount);
      }
      return result;
    }

    default:
      throw new Error(`Unsupported interval: ${interval}`);
  }
}

// get zod object keys recursively
export const zodKeys = <T extends z.ZodTypeAny>(schema: T): string[] => {
  // make sure schema is not null or undefined
  if (schema === null || schema === undefined) return [];
  // check if schema is nullable or optional
  if (schema instanceof z.ZodNullable || schema instanceof z.ZodOptional)
    return zodKeys(schema.unwrap());
  // check if schema is an array
  if (schema instanceof z.ZodArray) return zodKeys(schema.element);
  // check if schema is an object
  if (schema instanceof z.ZodObject) {
    // get key/value pairs from schema
    const entries = Object.entries(schema.shape);
    // loop through key/value pairs
    return entries.flatMap(([key, value]) => {
      // get nested keys
      const nested =
        value instanceof z.ZodType
          ? zodKeys(value).map((subKey) => `${key}.${subKey}`)
          : [];
      // return nested keys
      return nested.length ? nested : key;
    });
  }
  // return empty array
  return [];
};

export const ARRAY_DELIMITER = ",";
export const SLIDER_DELIMITER = "-";
export const SPACE_DELIMITER = "_";
export const RANGE_DELIMITER = "-";
export const SORT_DELIMITER = ".";