import { AppError } from "@/domain/errors";

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export function ok(): ActionResult<undefined>;
export function ok<T>(data: T): ActionResult<T>;
export function ok<T>(data?: T): ActionResult<T | undefined> {
  return { ok: true, data };
}

export function fail(error: unknown): ActionResult<never> {
  if (error instanceof AppError) {
    return { ok: false, error: error.message };
  }
  return { ok: false, error: "Something went wrong." };
}
