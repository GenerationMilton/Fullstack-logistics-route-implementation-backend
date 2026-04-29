import { z } from "zod";

export const healthQuerySchema = z.object({
  includeTimestamp: z
    .string()
    .optional()
    .transform((value) => value === "true"),
});

export type HealthQueryDto = z.infer<typeof healthQuerySchema>;
