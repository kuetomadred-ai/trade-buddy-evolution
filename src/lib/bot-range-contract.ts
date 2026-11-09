import { z } from "zod";

export const botRangeSchema = z.object({
  accountId: z.string().regex(/^[A-Za-z0-9_-]{1,80}$/),
  symbol: z.literal("XAUUSD"),
  range_high: z.number().finite().positive().max(1_000_000),
  range_low: z.number().finite().positive().max(1_000_000),
}).strict().refine((value) => value.range_high > value.range_low, {
  message: "Upper range must exceed lower range",
});