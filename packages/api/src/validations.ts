import { sub, add } from "date-fns";
import { z } from "zod";

// export const roundToNearest15Minutes = (date: Date) => {
//   const minutes = date.getMinutes();
//   const remainder = minutes % 15;
//   const minutesToAdd = remainder === 0 ? 0 : 15 - remainder;
//   date.setMinutes(minutes + minutesToAdd, 0, 0);
//   return date;
// };

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
