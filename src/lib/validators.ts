import { z } from "zod";

export const RoomBody = z.object({
  name: z.string().trim().min(2).max(60),
  capacity: z.coerce.number().int().min(1).max(100),
  location: z.string().trim().max(100).optional().nullable(),
  facilities: z.array(z.string().trim().min(1).max(40)).max(12).default([]),
  description: z.string().trim().max(300).optional().nullable(),
  checkinCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9-]{3,30}$/, "Kode check-in: huruf/angka/strip, 3–30 karakter"),
  isActive: z.boolean().default(true),
});

/** Kode error PostgreSQL dari error driver/drizzle */
export function pgErrorCode(e: unknown): string | undefined {
  const err = e as { code?: string; cause?: { code?: string } };
  return err?.cause?.code ?? err?.code;
}
