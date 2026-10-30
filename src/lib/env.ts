import { z } from "zod";

const blankToUndefined = (value: unknown) => (value === "" ? undefined : value);

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL"),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1, "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is required"),
  // Push and absolute app URL are unused until notifications ship.
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.preprocess(blankToUndefined, z.string().min(1).optional()),
  NEXT_PUBLIC_APP_URL: z.preprocess(
    blankToUndefined,
    z.string().url("NEXT_PUBLIC_APP_URL must be a valid URL").optional()
  ),
});

const serverSchema = publicSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "SUPABASE_SERVICE_ROLE_KEY is required"),
  // Push, cron, and mail are unused until later phases.
  VAPID_PRIVATE_KEY: z.preprocess(blankToUndefined, z.string().min(1).optional()),
  VAPID_SUBJECT: z.preprocess(blankToUndefined, z.string().min(1).optional()),
  CRON_SECRET: z.preprocess(blankToUndefined, z.string().min(1).optional()),
  RESEND_API_KEY: z.preprocess(blankToUndefined, z.string().min(1).optional()),
  EMAIL_FROM: z.preprocess(blankToUndefined, z.string().email("EMAIL_FROM must be a valid email").optional()),
});

/**
 * Public env — safe to use in Client Components.
 * Validated lazily on first access so missing vars give a clear error,
 * not a cryptic Next.js compiler crash.
 */
let _publicEnv: z.infer<typeof publicSchema> | undefined;

export function getPublicEnv(): z.infer<typeof publicSchema> {
  if (!_publicEnv) {
    const result = publicSchema.safeParse({
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      NEXT_PUBLIC_VAPID_PUBLIC_KEY: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    });
    if (!result.success) {
      throw new Error(
        `\n\n❌ Missing environment variables:\n${result.error.errors.map((e) => `  • ${e.path.join(".")}: ${e.message}`).join("\n")}\n\nCopy .env.example to .env.local and fill in your Supabase credentials.\n`
      );
    }
    _publicEnv = result.data;
  }
  return _publicEnv;
}

/**
 * Server-only env. Import only from server modules.
 * Never import in Client Components or files marked 'use client'.
 */
export function getServerEnv() {
  const pub = getPublicEnv();
  const result = serverSchema.safeParse({
    ...pub,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY,
    VAPID_SUBJECT: process.env.VAPID_SUBJECT,
    CRON_SECRET: process.env.CRON_SECRET,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    EMAIL_FROM: process.env.EMAIL_FROM,
  });
  if (!result.success) {
    throw new Error(
      `\n\n❌ Missing server environment variables:\n${result.error.errors.map((e) => `  • ${e.path.join(".")}: ${e.message}`).join("\n")}\n`
    );
  }
  return result.data;
}
