"use client";

import { useEffect, useRef, useState, type FocusEvent, type FormEvent, type ReactNode } from "react";

/** Quiet period before a field edit is written. One rate for every autosave. */
export const SAVE_DEBOUNCE_MS = 500;

export type SaveState = "idle" | "saving" | "saved";

/**
 * `null` means the write succeeded. `false` means there was nothing to write.
 * A string is an error to show.
 */
export type SaveResult = string | null | false;

export function useDebouncedFormSave(save: (formData: FormData) => Promise<SaveResult>) {
  const formRef = useRef<HTMLFormElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveRef = useRef(save);
  saveRef.current = save;
  const generation = useRef(0);
  const [status, setStatus] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  async function run(formData: FormData, id: number) {
    setStatus("saving");
    setError(null);
    try {
      const message = await saveRef.current(formData);
      if (id !== generation.current) return;
      if (message === false) {
        setStatus("idle");
        return;
      }
      if (message) {
        setStatus("idle");
        setError(message);
        return;
      }
      setStatus("saved");
    } catch (err) {
      if (id !== generation.current) return;
      setStatus("idle");
      setError(err instanceof Error ? err.message : "Could not save.");
    }
  }

  function schedule(immediate = false) {
    if (timer.current) clearTimeout(timer.current);
    const id = ++generation.current;
    const fire = () => {
      const form = formRef.current;
      if (!form) return;
      if (!form.checkValidity()) {
        const invalid = form.querySelector(":invalid");
        const missing = invalid instanceof HTMLInputElement
          || invalid instanceof HTMLTextAreaElement
          || invalid instanceof HTMLSelectElement
          ? invalid.validity.valueMissing
          : false;
        if (missing) {
          setStatus("idle");
          setError(null);
          return;
        }
        const message = invalid instanceof HTMLInputElement
          || invalid instanceof HTMLTextAreaElement
          || invalid instanceof HTMLSelectElement
          ? invalid.validationMessage
          : "Check this form before it can be saved.";
        setStatus("idle");
        setError(message);
        return;
      }
      void run(new FormData(form), id);
    };
    if (immediate) fire();
    else timer.current = setTimeout(fire, SAVE_DEBOUNCE_MS);
  }

  return { formRef, schedule, status, error };
}

export function SaveStatusLine({ status, savedLabel = "Saved" }: { status: SaveState; savedLabel?: string }) {
  if (status === "idle") return null;
  return (
    <p className="page-copy" role="status">
      {status === "saving" ? "Saving…" : savedLabel}
    </p>
  );
}

export function AutosaveForm({
  save,
  className,
  children,
}: {
  save: (formData: FormData) => Promise<SaveResult>;
  className?: string;
  children: ReactNode;
}) {
  const { formRef, schedule, status, error } = useDebouncedFormSave(save);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    schedule(true);
  }

  function onBlur(event: FocusEvent<HTMLFormElement>) {
    const next = event.relatedTarget;
    if (next instanceof Node && event.currentTarget.contains(next)) return;
    schedule(true);
  }

  return (
    <form
      ref={formRef}
      className={className}
      onSubmit={onSubmit}
      onInput={() => schedule(false)}
      onChange={() => schedule(false)}
      onBlur={onBlur}
    >
      {children}
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      <SaveStatusLine status={status} />
    </form>
  );
}
