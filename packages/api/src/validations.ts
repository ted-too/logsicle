import { sub, add } from "date-fns";
import { z } from "zod";

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
  start: dateTimeSchema.catch((ctx) => {
    console.log(ctx.error);
    return sub(new Date(), { hours: 4 });
  }),
  end: dateTimeSchema.catch(add(new Date(), { hours: 1 })),
};
